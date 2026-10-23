"""SI-unit planar two-link kinematics. This module does not claim dynamic simulation."""
import math

L1, L2 = 0.6, 0.45

def forward(q1, q2):
    return (L1 * math.cos(q1) + L2 * math.cos(q1 + q2), L1 * math.sin(q1) + L2 * math.sin(q1 + q2))

def inverse(x, y, elbow=1):
    if not all(math.isfinite(v) for v in (x, y)):
        raise ValueError('Target coordinates must be finite.')
    c = (x*x + y*y - L1*L1 - L2*L2) / (2*L1*L2)
    if c < -1-1e-10 or c > 1+1e-10:
        raise ValueError('Target is outside the reachable annulus.')
    q2 = (1 if elbow >= 0 else -1) * math.acos(max(-1, min(1, c)))
    q1 = math.atan2(y, x) - math.atan2(L2*math.sin(q2), L1+L2*math.cos(q2))
    # Equivalent turns must share the principal angle before joint-limit checks.
    q1 = math.atan2(math.sin(q1), math.cos(q1))
    return q1, q2

def validate_request(data):
    if not isinstance(data, dict):
        raise ValueError('Expected a JSON object.')
    limits={'q1':(-170,170,0),'q2':(-150,150,0),'target1':(-170,170,35),'target2':(-150,150,65),'kp':(10,300,80),'kd':(1,40,12),'payload':(0.05,2,0.25),'duration':(1,6,3)}
    result={}
    if set(data)-set(limits):
        raise ValueError('Unsupported simulation parameter.')
    for key,(low,high,default) in limits.items():
        value=data.get(key,default)
        if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value) or not low <= value <= high:
            raise ValueError(f'{key} must be a finite number in [{low}, {high}].')
        result[key]=float(value)
    return result

def robot_urdf(payload):
    if not math.isfinite(payload) or not .05 <= payload <= 2:
        raise ValueError('Invalid payload mass.')
    return f'''<?xml version="1.0"?>
<robot name="EntelloqTwoLink">
  <link name="base"><inertial><mass value="2"/><inertia ixx="0.01" iyy="0.01" izz="0.01" ixy="0" ixz="0" iyz="0"/></inertial><visual><geometry><cylinder radius="0.09" length="0.1"/></geometry></visual></link>
  <link name="upper"><inertial><origin xyz="0.3 0 0"/><mass value="1"/><inertia ixx="0.001" iyy="0.031" izz="0.031" ixy="0" ixz="0" iyz="0"/></inertial><visual><origin xyz="0.3 0 0"/><geometry><box size="0.6 0.07 0.07"/></geometry></visual><collision><origin xyz="0.3 0 0"/><geometry><box size="0.6 0.07 0.07"/></geometry></collision></link>
  <joint name="shoulder" type="revolute"><parent link="base"/><child link="upper"/><origin xyz="0 0 0.2"/><axis xyz="0 0 1"/><limit lower="-2.96706" upper="2.96706" effort="100" velocity="15"/></joint>
  <link name="lower"><inertial><origin xyz="0.225 0 0"/><mass value="0.7"/><inertia ixx="0.001" iyy="0.012" izz="0.012" ixy="0" ixz="0" iyz="0"/></inertial><visual><origin xyz="0.225 0 0"/><geometry><box size="0.45 0.06 0.06"/></geometry></visual><collision><origin xyz="0.225 0 0"/><geometry><box size="0.45 0.06 0.06"/></geometry></collision></link>
  <joint name="elbow" type="revolute"><parent link="upper"/><child link="lower"/><origin xyz="0.6 0 0"/><axis xyz="0 0 1"/><limit lower="-2.61799" upper="2.61799" effort="100" velocity="15"/></joint>
  <link name="tool"><inertial><mass value="{payload}"/><inertia ixx="0.0003" iyy="0.0003" izz="0.0003" ixy="0" ixz="0" iyz="0"/></inertial><visual><geometry><sphere radius="0.045"/></geometry></visual></link>
  <joint name="tool_mount" type="fixed"><parent link="lower"/><child link="tool"/><origin xyz="0.45 0 0"/></joint>
</robot>'''
