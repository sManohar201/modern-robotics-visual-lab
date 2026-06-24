import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export interface PageDef {
  id: string;
  title: string;
  status: "ready" | "soon";
  /** challenge ids living on this page — drives sidebar progress */
  challenges: string[];
  component?: LazyExoticComponent<ComponentType>;
  /** for "soon" pages: what the page will contain */
  planned?: string[];
}

export interface ChapterDef {
  id: string;
  number: number;
  title: string;
  pages: PageDef[];
}

export const chapters: ChapterDef[] = [
  {
    id: "phys1",
    number: 1,
    title: "College Physics & Dynamics",
    pages: [
      {
        id: "phys1-foundations",
        title: "Vectors, Motion, and Projectiles",
        status: "ready",
        challenges: ["phys1-vector-3-4-5", "phys1-motion-stop", "phys1-projectile-target"],
        component: lazy(() => import("./physics/Foundations")),
      },
      {
        id: "phys2-forces",
        title: "Forces and Newtonian Mechanics",
        status: "ready",
        challenges: ["phys2-fbd-accel3", "phys2-incline-slip", "phys2-pulley-accel2"],
        component: lazy(() => import("./physics/Forces")),
      },
      {
        id: "phys3-energy",
        title: "Work, Energy, and Power",
        status: "ready",
        challenges: ["phys3-coaster-top", "phys3-spring-pe20", "phys3-work-50j"],
        component: lazy(() => import("./physics/Energy")),
      },
      {
        id: "phys4-momentum",
        title: "Momentum and Collisions",
        status: "ready",
        challenges: ["phys4-elastic-stop", "phys4-cm-target"],
        component: lazy(() => import("./physics/Momentum")),
      },
      {
        id: "phys5-rotation",
        title: "Rotational Motion",
        status: "ready",
        challenges: ["phys5-torque-2nm", "phys5-rolling-sphere-wins"],
        component: lazy(() => import("./physics/Rotation")),
      },
      {
        id: "phys6-oscillations",
        title: "Oscillations and Waves",
        status: "ready",
        challenges: ["phys6-critical-damp", "phys6-pendulum-chaos", "phys6-resonance-peak"],
        component: lazy(() => import("./physics/Oscillations")),
      },
      {
        id: "phys7-dynamics",
        title: "Engineering Dynamics",
        status: "ready",
        challenges: ["phys7-fourbar-trace", "phys7-icr-verify"],
        component: lazy(() => import("./physics/EngineeringDynamics")),
      },
      {
        id: "phys8-lagrangian",
        title: "Lagrangian and Analytical Mechanics",
        status: "ready",
        challenges: ["phys8-double-chaos"],
        component: lazy(() => import("./physics/Lagrangian")),
      },
      {
        id: "phys9-fluids",
        title: "Fluids and Continuum Preview",
        status: "ready",
        challenges: ["phys9-pressure-50kpa", "phys9-buoy-float", "phys9-venturi-fast"],
        component: lazy(() => import("./physics/Fluids")),
      },
      {
        id: "phys10-robotics",
        title: "Dynamics for Robotics",
        status: "ready",
        challenges: ["phys10-gravity-comp", "phys10-coriolis-deflect"],
        component: lazy(() => import("./physics/RoboticsB")),
      },
    ],
  },
  {
    id: "ch2",
    number: 2,
    title: "Configuration Space",
    pages: [
      {
        id: "ch2-config-dof",
        title: "Configuration & Degrees of Freedom",
        status: "ready",
        challenges: ["ch2-dof-explore", "ch2-dof-3d", "ch2-dof-quiz"],
        component: lazy(() => import("./ch2/ConfigurationDof")),
      },
      {
        id: "ch2-joints",
        title: "Robot Joints",
        status: "ready",
        challenges: ["ch2-joints-helical", "ch2-joints-quiz"],
        component: lazy(() => import("./ch2/Joints")),
      },
      {
        id: "ch2-grubler",
        title: "Grübler's Formula",
        status: "ready",
        challenges: ["ch2-grubler-fourbar", "ch2-grubler-quiz"],
        component: lazy(() => import("./ch2/Grubler")),
      },
      {
        id: "ch2-mechanisms",
        title: "Mechanisms in Practice",
        status: "ready",
        challenges: ["ch2-mech-fivebar", "ch2-mech-redundant", "ch2-mech-sg"],
        component: lazy(() => import("./ch2/ClassicalMechanisms")),
      },
      {
        id: "ch2-topology",
        title: "The Shape of C-space",
        status: "ready",
        challenges: ["ch2-topo-wrap", "ch2-topo-target"],
        component: lazy(() => import("./ch2/Topology")),
      },
      {
        id: "ch2-representation",
        title: "Representing C-space",
        status: "ready",
        challenges: ["ch2-rep-pole", "ch2-rep-gimbal"],
        component: lazy(() => import("./ch2/Representation")),
      },
      {
        id: "ch2-quaternions",
        title: "Unit Quaternions",
        status: "ready",
        challenges: ["ch2-quat-doublecover", "ch2-quat-spinor", "ch2-quat-slerp"],
        component: lazy(() => import("./ch2/Quaternions")),
      },
      {
        id: "ch2-constraints",
        title: "Holonomic & Nonholonomic Constraints",
        status: "ready",
        challenges: ["ch2-park", "ch2-coin-park"],
        component: lazy(() => import("./ch2/Constraints")),
      },
      {
        id: "ch2-task-workspace",
        title: "Task Space & Workspace",
        status: "ready",
        challenges: ["ch2-ws-disk", "ch2-ws-scara"],
        component: lazy(() => import("./ch2/TaskWorkspace")),
      },
    ],
  },
  {
    id: "ch3",
    number: 3,
    title: "Rigid-Body Motions",
    pages: [
      {
        id: "ch3-rotations",
        title: "Rotation Matrices & SO(3)",
        status: "ready",
        challenges: ["ch3-rot-pointdown", "ch3-rot-order"],
        component: lazy(() => import("./ch3/Rotations")),
      },
      {
        id: "ch3-angular-velocity",
        title: "Angular Velocity & Skew Matrices",
        status: "ready",
        challenges: ["ch3-angvel-body", "ch3-angvel-quiz"],
        component: lazy(() => import("./ch3/AngularVelocity")),
      },
      {
        id: "ch3-expcoords",
        title: "Exponential Coordinates of Rotation",
        status: "ready",
        challenges: ["ch3-exp-match"],
        component: lazy(() => import("./ch3/ExpCoords")),
      },
      {
        id: "ch3-se3",
        title: "Homogeneous Transformations & SE(3)",
        status: "ready",
        challenges: ["ch3-se3-chain", "ch3-se3-inverse"],
        component: lazy(() => import("./ch3/Se3")),
      },
      {
        id: "ch3-twists",
        title: "Twists & Screw Motions",
        status: "ready",
        challenges: ["ch3-twist-screw"],
        component: lazy(() => import("./ch3/Twists")),
      },
      {
        id: "ch3-wrenches",
        title: "Wrenches",
        status: "ready",
        challenges: ["ch3-wrench-power", "ch3-wrench-quiz"],
        component: lazy(() => import("./ch3/Wrenches")),
      },
    ],
  },
  {
    id: "ch4",
    number: 4,
    title: "Forward Kinematics",
    pages: [
      {
        id: "ch4-intro",
        title: "Forward Kinematics: The Big Picture",
        status: "ready",
        challenges: ["ch4-fk-quiz"],
        component: lazy(() => import("./ch4/Intro")),
      },
      {
        id: "ch4-poe-space",
        title: "Space Form: Product of Exponentials",
        status: "ready",
        challenges: ["ch4-poe-space-match"],
        component: lazy(() => import("./ch4/PoeSpace")),
      },
      {
        id: "ch4-poe-body",
        title: "Body Form, B_i, and URDF",
        status: "ready",
        challenges: ["ch4-poe-body-match"],
        component: lazy(() => import("./ch4/PoeBody")),
      },
    ],
  },
  {
    id: "ch5",
    number: 5,
    title: "Velocity Kinematics & Statics",
    pages: [
      {
        id: "ch5-jacobian",
        title: "The Jacobian: Columns Are Twists",
        status: "ready",
        challenges: ["ch5-jac-columns"],
        component: lazy(() => import("./ch5/Jacobian")),
      },
      {
        id: "ch5-space-body",
        title: "Space & Body Jacobian",
        status: "ready",
        challenges: ["ch5-sb-frozen", "ch5-sb-quiz"],
        component: lazy(() => import("./ch5/SpaceBody")),
      },
      {
        id: "ch5-statics",
        title: "Statics: Force Through the Transpose",
        status: "ready",
        challenges: ["ch5-statics-load", "ch5-statics-door"],
        component: lazy(() => import("./ch5/Statics")),
      },
      {
        id: "ch5-singularities",
        title: "Singularities",
        status: "ready",
        challenges: ["ch5-sing-reach"],
        component: lazy(() => import("./ch5/Singularities")),
      },
      {
        id: "ch5-manipulability",
        title: "Manipulability & Force Ellipsoids",
        status: "ready",
        challenges: ["ch5-manip-isotropy", "ch5-manip-quiz"],
        component: lazy(() => import("./ch5/Manipulability")),
      },
    ],
  },
  {
    id: "ch6",
    number: 6,
    title: "Inverse Kinematics",
    pages: [
      {
        id: "ch6-ik-problem",
        title: "The IK Problem: Many Answers, or None",
        status: "ready",
        challenges: ["ch6-ik-boundary"],
        component: lazy(() => import("./ch6/IkProblem")),
      },
      {
        id: "ch6-analytic-puma",
        title: "Analytic IK: Decoupling the PUMA Wrist",
        status: "ready",
        challenges: ["ch6-puma-singularity"],
        component: lazy(() => import("./ch6/AnalyticPuma")),
      },
      {
        id: "ch6-numerical-ik",
        title: "Numerical IK: Newton–Raphson",
        status: "ready",
        challenges: ["ch6-nr-elbow-down"],
        component: lazy(() => import("./ch6/NumericalIk")),
      },
      {
        id: "ch6-pseudoinverse",
        title: "The Pseudoinverse & Damping",
        status: "ready",
        challenges: ["ch6-pinv-damp", "ch6-pinv-quiz"],
        component: lazy(() => import("./ch6/Pseudoinverse")),
      },
      {
        id: "ch6-inverse-velocity",
        title: "Inverse Velocity & Redundancy",
        status: "ready",
        challenges: ["ch6-redundancy-dodge", "ch6-loop-quiz"],
        component: lazy(() => import("./ch6/InverseVelocity")),
      },
    ],
  },
  {
    id: "ch7",
    number: 7,
    title: "Kinematics of Closed Chains",
    pages: [
      {
        id: "ch7-closed-chains",
        title: "Closed Chains & the IK/FK Flip",
        status: "ready",
        challenges: ["ch7-rpr-inverse"],
        component: lazy(() => import("./ch7/ClosedChains")),
      },
      {
        id: "ch7-forward-assemblies",
        title: "Forward Kinematics: Many Assemblies",
        status: "ready",
        challenges: ["ch7-rpr-fk-modes"],
        component: lazy(() => import("./ch7/ForwardAssemblies")),
      },
      {
        id: "ch7-stewart-gough",
        title: "The Stewart–Gough Platform",
        status: "ready",
        challenges: ["ch7-sg-tilt"],
        component: lazy(() => import("./ch7/StewartGough")),
      },
      {
        id: "ch7-statics",
        title: "Statics & the Constraint Jacobian",
        status: "ready",
        challenges: ["ch7-statics-pure-force", "ch7-statics-quiz"],
        component: lazy(() => import("./ch7/Statics")),
      },
      {
        id: "ch7-singularities",
        title: "Singularities of Closed Chains",
        status: "ready",
        challenges: ["ch7-fourbar-bifurcation", "ch7-fivebar-singularity"],
        component: lazy(() => import("./ch7/Singularities")),
      },
    ],
  },
];

export const allPages = chapters.flatMap(c => c.pages);

export function findPage(id: string) {
  for (const c of chapters) {
    const p = c.pages.find(p => p.id === id);
    if (p) return { chapter: c, page: p };
  }
  return null;
}
