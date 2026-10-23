# Robotics learning module

A two-link planar arm for Physics Entelloq. The ordinary browser workspace solves forward and inverse kinematics. New dynamics are computed by an actual local Genesis World CPU process; a bundled recorded run remains usable when that service is unavailable.

## Run the local engine

Use Python 3.12 in a virtual environment. Install CPU PyTorch first, then Genesis:

```sh
python -m venv .venv
# Activate the environment using your platform's normal command.
python -m pip install torch==2.14.1 --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r requirements.txt
python server.py
```

The workbench is at http://127.0.0.1:8772. Genesis and its dependencies are a substantial local download. Initial import/compilation can take a few minutes; calculations have a 180-second process deadline. The service accepts only bounded numeric configurations, runs one simulation at a time, and never accepts code. It binds to loopback and checks Host and browser Origin. It is not a public multi-user service.

Within Physics, use the companion server documented in `scientific-labs/COMPANION.md`. Hosted static Physics includes the geometric workbench and real recording. It only labels a new run as computed when the local engine returns successfully.

## What is simulated

Lengths are 0.60 m and 0.45 m. Shoulder and elbow limits are ±170° and ±150°. Both revolute axes are vertical, giving a horizontal arm with a fixed base. Genesis integrates rigid-body inertia at 120 steps/s with two substeps and a PD target controller limited to ±100 N·m. Tool payload is 0.05–2 kg. Each run initializes the joint angles once, then applies torque through position control; intermediate positions are not teleported. Reported tool positions come from simulated joint angles through rigid-link forward kinematics.

The geometric reachable annulus is 0.15–1.05 m, further limited by the joint constraints. There is no obstacle planning, grasping, learned policy, motor calibration, or real hardware evidence. This is an educational model of one small arm, not a universal robot simulator.

## Verification

- 8 Python tests cover inverse/forward consistency, the alternative elbow, angle wrapping, unreachable targets, numeric limits and generated URDF.
- `tests/state-browser.mjs` covers invalid/blank target inputs and recording-state restoration; its engine availability response is mocked, not dynamics.
- `tests/browser.mjs` exercises the actual recording, export, invalidation, mobile layout, reduced-motion initial state and browser errors. Set `RUN_DYNAMICS=1` to exercise the actual local Genesis API.
- The committed recording has 91 samples across 3 s and ends within 0.000001 m of its target under the stated model.
- A second actual API run changed damping to 5 N·m·s/rad and payload to 0.75 kg. Full output is in `qa/live-dynamics.json`; the response was finite and moved through intermediate positions before reaching its target.

```sh
python -m unittest discover -s tests -p 'test_*.py'
# Install Playwright in a sibling tool or provide CODEX_NODE_MODULES.
node tests/state-browser.mjs
node tests/browser.mjs
```

Browser checks used installed Chrome. No real hardware or motion capture was tested. Recorded-run timestamps identify simulation generation time, not experimental measurements.

## Sources and licences

- [Genesis World](https://github.com/Genesis-Embodied-AI/Genesis), Apache-2.0; tested version 1.4.5.
- [Genesis robot-control documentation](https://genesis-world.readthedocs.io/en/latest/user_guide/getting_started/control_your_robot.html).
- [PyTorch](https://github.com/pytorch/pytorch), BSD-style licence; tested CPU build 2.14.1.

The URDF, interface, kinematics and recording are authored for this project. No third-party robot mesh is included. Genesis and PyTorch are installed from their distributions; their upstream licence notices remain in those packages.
