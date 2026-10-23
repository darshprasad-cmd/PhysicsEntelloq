"""Run real Genesis rigid-body PD dynamics in an isolated process and save evidence."""
import json, math, sys, tempfile, time
from pathlib import Path
from kinematics import validate_request, robot_urdf, forward

def run(raw):
    import genesis as gs
    import numpy as np
    import importlib.metadata
    p=validate_request(raw)
    gs.init(backend=gs.cpu, logging_level='warning')
    with tempfile.TemporaryDirectory(prefix='entelloq-robot-') as folder:
        urdf=Path(folder)/'arm.urdf';urdf.write_text(robot_urdf(p['payload']),encoding='utf-8')
        scene=gs.Scene(sim_options=gs.options.SimOptions(dt=1/120,substeps=2,gravity=(0,0,-9.81)),show_viewer=False)
        robot=scene.add_entity(gs.morphs.URDF(file=str(urdf),fixed=True))
        scene.build()
        indices=[robot.get_joint(name).dofs_idx_local[0] for name in ['shoulder','elbow']]
        robot.set_dofs_kp(np.array([p['kp'],p['kp']]),dofs_idx_local=indices)
        robot.set_dofs_kv(np.array([p['kd'],p['kd']]),dofs_idx_local=indices)
        robot.set_dofs_force_range(np.array([-100,-100]),np.array([100,100]),dofs_idx_local=indices)
        initial=np.radians([p['q1'],p['q2']]);target=np.radians([p['target1'],p['target2']])
        robot.set_dofs_position(initial,dofs_idx_local=indices)
        robot.control_dofs_position(target,dofs_idx_local=indices)
        samples=[]
        def record(t):
            q=robot.get_dofs_position(dofs_idx_local=indices).detach().cpu().numpy().reshape(-1).tolist()
            x,y=forward(q[0],q[1])
            samples.append({'t':round(t,7),'q1':q[0],'q2':q[1],'x':x,'y':y})
        record(0)
        for i in range(round(p['duration']*120)):
            scene.step()
            if (i+1)%4==0:record((i+1)/120)
        final=samples[-1];tx,ty=forward(*target)
        if not all(math.isfinite(v) for s in samples for v in s.values()):raise RuntimeError('Simulation produced a nonfinite state.')
        return {'engine':'Genesis World','engineVersion':importlib.metadata.version('genesis-world'),'backend':'CPU','createdAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'config':p,'samples':samples,'target':{'x':tx,'y':ty},'finalError':math.hypot(final['x']-tx,final['y']-ty),'units':{'time':'s','angle':'rad','position':'m','payload':'kg','torqueLimit':'100 N m'},'assumptions':['Two horizontal links with vertical revolute axes.','Position targets applied through Genesis PD control; joint positions are not teleported during the run.','End-effector coordinates derived from simulated joint angles by rigid-link forward kinematics.','Fixed base; no environment obstacles or grasping; no hardware validation.']}

if __name__=='__main__':
    try:
        data=run(json.loads(Path(sys.argv[1]).read_text(encoding='utf-8')))
        Path(sys.argv[2]).write_text(json.dumps(data,indent=2),encoding='utf-8')
    except Exception as e:
        Path(sys.argv[2]).write_text(json.dumps({'error':f'{type(e).__name__}: {e}'}),encoding='utf-8');raise
