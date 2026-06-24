# College Physics and Dynamics Visual Lab Plan

## Purpose

Build a supplemental visual learning course that complements the Modern Robotics
Visual Lab. The course should help students develop physical intuition for
college physics, engineering dynamics, manipulation, motion planning, control,
and robotics-adjacent mechanics through interactive simulations, concise
derivations, and guided challenges.

The goal is not to replace a textbook. The goal is to make the important ideas
visible, adjustable, and testable.

## Target Audience

- Undergraduate students in calculus-based physics.
- Engineering students taking statics, dynamics, controls, or robotics.
- Robotics learners who need stronger foundations in mechanics and physical
  modeling.
- Self-learners who benefit from visual and interactive explanations.

## Course Principles

- Start every topic with a physical scene or manipulable model.
- Introduce equations after the behavior is visible.
- Keep notation compatible with engineering mechanics and robotics where
  possible.
- Use challenges with live feedback to turn passive reading into active
  prediction.
- Reuse visual language from the Modern Robotics Visual Lab.
- Bridge core physics concepts toward robotics, manipulation, planning, and
  control.

## Lesson Pattern

Each lesson should follow a consistent structure:

1. Visual intuition: present the physical situation before formulas.
2. Interactive model: expose parameters students can drag, slide, or toggle.
3. Mathematical form: introduce the governing equations and notation.
4. Worked example: solve one concrete scenario step by step.
5. Challenge mode: ask students to predict or tune the system to satisfy a
   target.
6. Robotics or engineering connection: show where the idea appears in robots,
   mechanisms, control systems, or motion planning.

## Module Map

### 1. Foundations of Motion

Topics:

- Scalars, vectors, coordinate frames, and units.
- Position, displacement, velocity, and acceleration.
- 1D and 2D motion.
- Relative motion.
- Motion graphs.

Interactive tools:

- Vector decomposition visualizer.
- Position-velocity-acceleration graph explorer.
- Projectile motion sandbox.
- Relative motion and moving-frame visualizer.

Robotics bridge:

- State variables.
- Coordinate frames.
- Trajectory descriptions.

### 2. Forces and Newtonian Mechanics

Topics:

- Free-body diagrams.
- Newton's laws.
- Weight, normal force, tension, friction, and drag.
- Inclines, pulleys, and connected bodies.
- Static versus kinetic friction.

Interactive tools:

- Free-body diagram builder.
- Block-on-ramp simulator.
- Connected-mass pulley simulator.
- Friction threshold explorer.

Robotics bridge:

- Contact forces.
- Grasping and support constraints.
- Actuator force limits.

### 3. Work, Energy, and Power

Topics:

- Work as force through displacement.
- Kinetic energy.
- Gravitational and elastic potential energy.
- Conservative and non-conservative forces.
- Power and efficiency.
- Energy diagrams.

Interactive tools:

- Work integral area-under-curve tool.
- Roller-coaster energy visualizer.
- Spring-mass energy exchange.
- Energy loss and friction simulator.

Robotics bridge:

- Energy methods.
- Potential fields.
- Energy-aware motion planning.

### 4. Momentum and Collisions

Topics:

- Linear momentum.
- Impulse.
- Conservation of momentum.
- Elastic and inelastic collisions.
- Center of mass.
- 2D collision geometry.

Interactive tools:

- 1D collision sandbox.
- 2D collision sandbox.
- Impulse-force-time visualizer.
- Center-of-mass tracker.

Robotics bridge:

- Impacts in manipulation.
- Pushing and striking.
- Momentum exchange in mobile robots.

### 5. Rotational Motion

Topics:

- Angular position, velocity, and acceleration.
- Torque and lever arms.
- Moment of inertia.
- Rotational kinetic energy.
- Rolling without slipping.
- Angular momentum.

Interactive tools:

- Torque lever-arm demo.
- Rotating rigid body visualizer.
- Moment of inertia shape comparison.
- Rolling object race.
- Angular momentum conservation demo.

Robotics bridge:

- Joint torques.
- Link inertia.
- Rotational dynamics of robot arms.

### 6. Oscillations and Waves

Topics:

- Simple harmonic motion.
- Spring-mass systems.
- Pendulums.
- Damping.
- Forced oscillation and resonance.
- Wave speed, superposition, and standing waves.

Interactive tools:

- Spring-mass oscillator.
- Pendulum phase portrait.
- Damping and resonance tuner.
- Wave superposition simulator.
- Standing wave visualizer.

Robotics bridge:

- Mechanical vibration.
- Compliance.
- Controller oscillation and resonance.

### 7. Engineering Dynamics

Topics:

- Particle kinematics.
- Rigid body planar motion.
- Instantaneous center of rotation.
- Relative velocity and acceleration.
- Linkages and mechanisms.
- Rolling and sliding bodies.

Interactive tools:

- Rigid body velocity field visualizer.
- Instantaneous center explorer.
- Four-bar linkage visualizer.
- Acceleration vector diagram builder.
- Rolling and sliding rigid body simulator.

Robotics bridge:

- Mechanism kinematics.
- Mobile robot rolling constraints.
- Manipulator link motion.

### 8. Lagrangian and Analytical Mechanics

Topics:

- Generalized coordinates.
- Constraints.
- Kinetic and potential energy formulation.
- Euler-Lagrange equations.
- Small oscillations.
- Coupled systems.

Interactive tools:

- Newton versus Lagrange pendulum comparison.
- Constraint manifold visualizer.
- Double pendulum simulator.
- Coupled oscillator explorer.

Robotics bridge:

- Robot equations of motion.
- Mass matrices.
- Constraint-based modeling.

### 9. Fluids and Continuum Preview

Topics:

- Pressure.
- Buoyancy.
- Fluid flow.
- Continuity equation.
- Bernoulli equation.
- Drag.

Interactive tools:

- Pressure-depth visualizer.
- Buoyancy sandbox.
- Flow tube simulator.
- Drag coefficient comparison.

Robotics bridge:

- Underwater robotics.
- Aerial drag.
- Fluid interaction forces.

### 10. Dynamics for Robotics Bridge

Topics:

- Forward and inverse dynamics.
- Mass matrix intuition.
- Coriolis and centrifugal effects.
- Gravity terms.
- Actuator torque limits.
- Energy and passivity.

Interactive tools:

- 2-link arm dynamics visualizer.
- Torque-to-motion simulator.
- Gravity compensation demo.
- Coriolis effect explorer.
- Energy shaping demo.

Robotics bridge:

- Manipulator control.
- Model-based control.
- Simulation and planning with dynamics.

## MVP Sequence

The first useful release should be narrow, coherent, and highly interactive:

1. Projectile motion sandbox.
2. Free-body diagram builder.
3. Block on incline with friction.
4. Work-energy roller coaster.
5. 1D and 2D collision simulator.
6. Torque and moment of inertia demo.
7. Spring-mass oscillator.
8. Four-bar linkage visualizer.
9. Double pendulum simulator.
10. 2-link robot arm dynamics bridge.

This gives the course a complete path from introductory mechanics to robotics
dynamics without requiring every planned module to be finished first.

## Suggested Repository Structure

```text
src/
  content/
    physics/
      foundations/
      forces/
      energy/
      momentum/
      rotation/
      oscillations/
    dynamics/
      rigid-body/
      mechanisms/
      analytical/
      robotics-bridge/
  components/
    sim/
      GraphPanel.tsx
      ParameterPanel.tsx
      FreeBodyDiagram.tsx
      PhasePlot.tsx
    three/
      RigidBodyScene.tsx
      MechanismScene.tsx
  lib/
    math/
      vector.ts
      integrators.ts
      mechanics.ts
      constraints.ts
```

## Shared Components to Build Early

- Parameter sliders with units and reset controls.
- Vector arrows with labels and component readouts.
- Time controls: play, pause, reset, step, and speed.
- Plot panels for position, velocity, acceleration, force, energy, and phase
  space.
- Challenge wrapper with target conditions and success detection.
- Equation blocks that can reveal one derivation step at a time.
- Free-body diagram primitives.
- Energy bar and energy curve components.

## Simulation and Math Utilities

Core utilities:

- Vector operations.
- Numerical integration with Euler, semi-implicit Euler, and RK4.
- Collision response helpers.
- Rigid body moment of inertia helpers.
- Constraint projection helpers for linkages and pendulums.
- Energy and momentum diagnostics.

Design guidance:

- Use closed-form solutions where they clarify the concept.
- Use numerical simulation where the system behavior is more important than an
  exact symbolic answer.
- Always expose simulation assumptions.
- Plot conserved quantities where conservation is part of the lesson.

## Visual Design Direction

- Keep the interface consistent with the Modern Robotics Visual Lab.
- Use colors to encode physical meaning, not decoration.
- Prefer dense but readable engineering-style panels over marketing layouts.
- Keep simulations first; explanatory text should support the visual model.
- Use 2D SVG or canvas for planar mechanics.
- Use Three.js only where 3D geometry genuinely improves understanding.

## Assessment Ideas

- Prediction challenges: choose the correct trajectory, force direction, or
  energy transfer before running the simulation.
- Parameter tuning challenges: adjust mass, angle, stiffness, damping, or
  velocity to hit a target.
- Diagnosis challenges: identify which physical assumption is violated.
- Derivation checkpoints: fill in the next equation step or select the correct
  free-body diagram.
- Robotics transfer tasks: map a physics idea onto a robot arm, mobile robot, or
  manipulation problem.

## Development Phases

### Phase 1: Course Skeleton

- Add route and registry support for physics and dynamics modules.
- Add placeholder pages for the MVP lessons.
- Add shared simulation controls and plotting components.
- Add a consistent lesson template.

### Phase 2: Mechanics Core

- Build projectile motion, free-body diagrams, incline friction, work-energy,
  and collisions.
- Add challenge detection to each lesson.
- Add unit-aware readouts and parameter constraints.

### Phase 3: Rotation and Oscillation

- Build torque, moment of inertia, rolling motion, spring-mass, pendulum, and
  resonance lessons.
- Add energy and phase-space plots.
- Add numerical integration utilities.

### Phase 4: Engineering Dynamics

- Build rigid body planar motion, instantaneous center, four-bar linkage, and
  acceleration diagram lessons.
- Add constraint and linkage helpers.

### Phase 5: Robotics Bridge

- Build 2-link arm dynamics lessons.
- Connect mass matrix, gravity, Coriolis, and torque intuition to existing
  Modern Robotics content.
- Add cross-links from robotics chapters back to physics foundations.

## Open Design Questions

- Should the course live inside the same table of contents as Modern Robotics,
  or become a parallel course selector?
- Should physics lessons use the same challenge persistence system as the
  robotics lessons?
- How much calculus should be shown inline versus hidden behind expandable
  derivation steps?
- Should the MVP focus on algebra-based or calculus-based physics first?
- Should engineering dynamics be its own course track or a later section of the
  physics course?

