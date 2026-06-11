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
        challenges: ["ch2-dof-explore", "ch2-dof-quiz"],
        component: lazy(() => import("./ch2/ConfigurationDof")),
      },
      {
        id: "ch2-grubler",
        title: "Grübler's Formula",
        status: "ready",
        challenges: ["ch2-grubler-fourbar", "ch2-grubler-quiz"],
        component: lazy(() => import("./ch2/Grubler")),
      },
      {
        id: "ch2-topology",
        title: "The Shape of C-space",
        status: "ready",
        challenges: ["ch2-topo-wrap", "ch2-topo-target"],
        component: lazy(() => import("./ch2/Topology")),
      },
      {
        id: "ch2-constraints",
        title: "Holonomic & Nonholonomic Constraints",
        status: "ready",
        challenges: ["ch2-park"],
        component: lazy(() => import("./ch2/Constraints")),
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
        id: "ch3-expcoords",
        title: "Exponential Coordinates of Rotation",
        status: "ready",
        challenges: ["ch3-exp-match"],
        component: lazy(() => import("./ch3/ExpCoords")),
      },
      {
        id: "ch3-se3",
        title: "Homogeneous Transformations SE(3)",
        status: "soon",
        challenges: [],
        planned: [
          "Drag a body frame in 3D and watch T = [R, p; 0, 1] update live",
          "Frame-chaining widget: compose T_sb · T_bc by snapping frames together",
          "Challenge: express the same point in three different frames",
        ],
      },
      {
        id: "ch3-twists",
        title: "Twists & Screw Motions",
        status: "soon",
        challenges: [],
        planned: [
          "Animated screw motion: vary pitch h from 0 (pure rotation) to ∞ (pure translation)",
          "Space twist vs body twist side-by-side on the same moving body",
          "Challenge: find the screw axis that carries frame A to frame B in one motion",
        ],
      },
      {
        id: "ch3-wrenches",
        title: "Wrenches",
        status: "soon",
        challenges: [],
        planned: [
          "Force + moment on a rigid body collapsed into a single wrench",
          "Why moment depends on the reference frame — drag the frame and watch m change",
        ],
      },
    ],
  },
  {
    id: "ch4",
    number: 4,
    title: "Forward Kinematics",
    pages: [
      {
        id: "ch4-poe-space",
        title: "Product of Exponentials (Space Form)",
        status: "soon",
        challenges: [],
        planned: [
          "Build a 3R arm joint by joint: each e^[S]θ applied in sequence, animated",
          "Toggle which exponentials are 'on' to see the order of operations",
          "Challenge: read screw axes off a robot diagram and reproduce its FK",
        ],
      },
      {
        id: "ch4-poe-body",
        title: "Product of Exponentials (Body Form)",
        status: "soon",
        challenges: [],
        planned: [
          "Same robot, axes expressed in {b}: watch B_i = Ad_{M⁻¹} S_i",
          "Side-by-side space vs body composition arriving at the same pose",
        ],
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
