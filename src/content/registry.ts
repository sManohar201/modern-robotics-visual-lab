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
        challenges: ["ch2-mech-redundant", "ch2-mech-sg"],
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
        title: "The Jacobian",
        status: "soon",
        challenges: [],
        planned: [
          "Wiggle one joint at a time: each Jacobian column is a visible twist",
          "Manipulability ellipse morphing live as the arm moves",
          "Challenge: drive the arm into a singularity and see a column collapse",
        ],
      },
      {
        id: "ch5-statics",
        title: "Statics & the Force Ellipsoid",
        status: "soon",
        challenges: [],
        planned: [
          "τ = Jᵀ F: push on the end-effector, watch joint torques respond",
          "Velocity vs force ellipsoids — why they are inverses",
        ],
      },
    ],
  },
  {
    id: "ch6",
    number: 6,
    title: "Inverse Kinematics",
    pages: [
      {
        id: "ch6-numerical-ik",
        title: "Numerical Inverse Kinematics",
        status: "soon",
        challenges: [],
        planned: [
          "Step Newton–Raphson iterations one at a time and watch the error twist shrink",
          "Break it: start near a singularity and see why damping is needed",
          "Challenge: pick an initial guess that converges to the elbow-down solution",
        ],
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
