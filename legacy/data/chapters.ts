export interface Topic {
  id: string;
  title: string;
  description: string;
  hasScene: boolean;
  theory: {
    subtitle: string;
    overview: string[];
    formula?: string;
    insights: string[];
  };
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  topics: Topic[];
}

export const chapters: Chapter[] = [
  {
    id: "chapter2",
    number: 2,
    title: "Configuration Space",
    topics: [
      {
        id: "cspace-intro",
        title: "Configuration & C-Space",
        description: "A single point in C-space represents a complete robot pose.",
        hasScene: true,
        theory: {
          subtitle: "The fundamental language of robot configuration",
          overview: [
            "A configuration of a robot is a complete specification of the position of every point of the robot body. The configuration space (C-space) is the set of all configurations the robot can assume. Rather than tracking every individual point of a continuous body, we represent each configuration by a finite set of coordinates — typically joint angles or displacements.",
            "For an n-joint robot, a configuration is a vector q = (θ₁, …, θₙ). The remarkable power of this abstraction is that one point in C-space encodes the complete physical pose. Motion planning becomes path planning in C-space, and obstacles in the workspace become regions to avoid in configuration space.",
            "The C-space is not always a flat Euclidean space. For a 2R robot with joints ranging over [-π, π], the C-space is a torus T² — think of a flat square with left/right edges identified and top/bottom edges identified. This topology must be respected when computing distances or planning paths."
          ],
          formula: "q = (\\theta_1, \\theta_2, \\ldots, \\theta_n) \\in \\mathcal{C}",
          insights: [
            "One point in C-space ↔ one complete physical configuration of the robot",
            "C-space dimension = number of independent generalized coordinates",
            "C-space is a manifold, not necessarily flat — topology matters for planning",
            "Obstacle C-space (C-obs) is the set of configurations causing collision; planners must avoid it",
            "The interactive lab maps joint sliders directly to a point in 2D C-space in real time"
          ]
        }
      },
      {
        id: "dof-counting",
        title: "Degrees of Freedom",
        description: "Grubler's formula for counting mechanism freedoms.",
        hasScene: false,
        theory: {
          subtitle: "Counting the independent parameters of motion",
          overview: [
            "The degrees of freedom (DOF) of a robot is the dimension of its C-space — the minimum number of independent real-valued coordinates required to specify any configuration. Knowing the DOF is fundamental: it determines how many actuators are needed and what tasks the robot can accomplish.",
            "Grubler's formula provides a systematic count: DOF = m(N − 1 − J) + Σfᵢ, where m = 6 for spatial mechanisms (m = 3 for planar), N is the total number of links (including the fixed ground link), J is the number of joints, and fᵢ is the degrees of freedom provided by joint i (1 for a revolute or prismatic, 3 for a spherical ball joint).",
            "A common trap is assuming all joints are simple (fᵢ = 1). For a spatial 6-DOF serial robot with all revolute joints: DOF = 6(7 − 1 − 6) + 6×1 = 6. Overconstrained mechanisms (negative Grubler count) may still be mobile if the constraints are geometrically dependent — the four-bar linkage is a classic example."
          ],
          formula: "\\text{DOF} = m(N - 1 - J) + \\sum_{i=1}^{J} f_i",
          insights: [
            "DOF is the dimension of C-space — the number of independent joint variables",
            "Planar: m = 3 (a free planar body has 3 DOF); Spatial: m = 6",
            "A 6-DOF robot arm can reach any position and orientation in 3D space (if unconstrained)",
            "Grubler's formula may give wrong answers for mechanisms with special geometry (over- or under-constrained)",
            "Under-actuated robots have fewer actuators than DOF; over-actuated have more actuators than DOF"
          ]
        }
      },
      {
        id: "topology",
        title: "C-Space Topology",
        description: "Why some spaces wrap like a torus while others are flat.",
        hasScene: false,
        theory: {
          subtitle: "The shape of configuration space matters for planning",
          overview: [
            "Beyond the number of dimensions, the topology of C-space — its global shape — profoundly affects robot behavior. A revolute joint with unlimited rotation has a C-space that is a circle S¹, not a line segment. Two revolute joints give a torus T², not a square.",
            "Common C-space topologies: ℝⁿ (prismatic joints, unbounded), Sⁿ (spherical joints), T²=S¹×S¹ (2R robot with wraparound joints), SO(3) (the rotation group — the C-space of a freely rotating rigid body). SO(3) is a non-trivial manifold: it cannot be parameterized globally without singularities (hence gimbal lock with Euler angles).",
            "For motion planning, topology matters because 'shortest path' is defined differently on a torus than on a plane. A path that crosses the θ₁ = ±π boundary on a torus is valid; a path planner that doesn't respect this wrapping will fail to find short routes across the boundary."
          ],
          formula: "\\mathcal{C}_{2R} = S^1 \\times S^1 = T^2",
          insights: [
            "Revolute joints (unlimited rotation) contribute a circle S¹ to C-space topology",
            "Prismatic (sliding) joints contribute a copy of ℝ¹",
            "SO(3) is the C-space of orientation — it cannot be globally parameterized without singularities",
            "Planning on a torus allows paths that 'wrap around' joint limits — no real singularity exists there",
            "Understanding topology prevents bugs in interpolation and distance computation"
          ]
        }
      },
      {
        id: "constraints",
        title: "Holonomic & Nonholonomic Constraints",
        description: "Differentiating pose constraints from velocity constraints.",
        hasScene: false,
        theory: {
          subtitle: "Not all constraints reduce the C-space dimension",
          overview: [
            "Constraints on a robot system come in two flavors. Holonomic (integrable) constraints directly restrict the configuration and reduce the effective C-space dimension. The rolling contact between two gears is holonomic: knowing the angle of one uniquely determines the other.",
            "Nonholonomic (non-integrable) constraints restrict velocities but not positions. A car cannot move sideways (zero lateral velocity), but over time it can reach any (x, y, θ) configuration. The constraint ẋ sin θ − ẏ cos θ = 0 is nonholonomic: it lives in the tangent space, not in C-space itself.",
            "Holonomic constraints reduce C-space dimension by one each. Nonholonomic constraints do not reduce C-space dimension but do restrict reachable velocity directions, requiring more complex (indirect) motions. Wheeled mobile robots and parallel manipulators are the classic examples in robotics."
          ],
          formula: "\\text{Holonomic: } g(q) = 0 \\quad \\text{Nonholonomic: } A(q)\\dot{q} = 0,\\ A \\text{ not integrable}",
          insights: [
            "Holonomic constraints reduce DOF and C-space dimension",
            "Nonholonomic constraints restrict instantaneous motion directions, not reachable configurations",
            "A car is nonholonomic: full C-space reachable, but only via curves — no lateral sliding allowed",
            "Pfaffian form A(q)q̇ = 0 expresses velocity constraints; integrability test via Frobenius theorem",
            "Nonholonomic robots require motion planning in velocity space, not just configuration space"
          ]
        }
      }
    ]
  },

  {
    id: "chapter3",
    number: 3,
    title: "Rigid-Body Motions",
    topics: [
      {
        id: "rotation-so3",
        title: "Rotation Matrices SO(3)",
        description: "3D orientations as orthogonal matrices with det = 1.",
        hasScene: true,
        theory: {
          subtitle: "The group of proper rotations in three dimensions",
          overview: [
            "The orientation of a rigid body in 3D space is described by a rotation matrix R ∈ SO(3). SO(3) is the special orthogonal group: the set of all 3×3 real matrices satisfying Rᵀ R = I and det(R) = +1. The three columns of R are the unit vectors of the body frame expressed in the space frame, making each column physically interpretable.",
            "Rotation matrices compose by multiplication and invert by transposition: R⁻¹ = Rᵀ. This means rotating a vector from body to space frame is p_s = R p_b, and rotating back is p_b = Rᵀ p_s. The product of two rotation matrices is another rotation matrix — SO(3) is closed under multiplication.",
            "Every rotation can also be parameterized by an axis ω̂ ∈ ℝ³ (unit vector) and angle θ ∈ ℝ. The exponential map e^{[ω̂]θ} converts this axis-angle representation to a rotation matrix via Rodrigues' formula: R = I + sin(θ)[ω̂] + (1−cos θ)[ω̂]². This connects SO(3) to its Lie algebra so(3) — the space of skew-symmetric matrices."
          ],
          formula: "SO(3) = \\{ R \\in \\mathbb{R}^{3\\times3} \\mid R^\\top R = I,\\ \\det(R) = 1 \\}",
          insights: [
            "Columns of R are the body frame's x̂, ŷ, ẑ axes expressed in the space frame",
            "Rᵀ = R⁻¹: rotation inversion is free (just transpose)",
            "Composition is left-to-right multiplication; order matters — rotations don't commute",
            "9 entries but only 3 DOF: 6 constraints from RᵀR = I, det = +1",
            "Euler angles also describe SO(3) but have singularities (gimbal lock) — unavoidable for any 3-parameter representation"
          ]
        }
      },
      {
        id: "exp-coords-so3",
        title: "Exponential Coordinates for Rotation",
        description: "Axis-angle representation and the matrix exponential.",
        hasScene: false,
        theory: {
          subtitle: "Mapping the Lie algebra so(3) to the group SO(3)",
          overview: [
            "Any rotation can be represented as a rotation by angle θ about a unit axis ω̂. The exponential coordinate vector is r = θ ω̂ ∈ ℝ³ — a vector whose direction is the rotation axis and whose magnitude is the rotation angle. This 3-vector uniquely parameterizes SO(3) in a ball of radius π (with antipodal identifications on the boundary).",
            "The connection to matrices is the matrix exponential: R = e^{[ω̂]θ}, where [ω̂] is the 3×3 skew-symmetric matrix (the Lie bracket matrix). The explicit formula is Rodrigues' rotation formula: R = I + sin θ [ω̂] + (1 − cos θ)[ω̂]².",
            "The logarithm map Log: SO(3) → so(3) inverts this, recovering the axis-angle from a matrix. This gives a minimal, singularity-free (except at ±π) representation. In Modern Robotics, this is the foundation of the product of exponentials formula for forward kinematics."
          ],
          formula: "R = e^{[\\hat{\\omega}]\\theta} = I + \\sin\\theta\\,[\\hat{\\omega}] + (1-\\cos\\theta)\\,[\\hat{\\omega}]^2",
          insights: [
            "Exponential coordinates r = θω̂ are the minimal 3D representation of SO(3)",
            "[ω̂] is a 3×3 skew-symmetric matrix: [ω̂]v = ω̂ × v for all vectors v",
            "Rodrigues' formula is exact — no Taylor approximation — for any angle θ",
            "Log(R) recovers the rotation axis and angle from a matrix",
            "At θ = 0: R = I (identity, no rotation); at θ = π: all axes through origin are equivalent to their antipodes"
          ]
        }
      },
      {
        id: "homog-se3",
        title: "Homogeneous Transforms SE(3)",
        description: "Rotation and translation unified in a 4×4 matrix.",
        hasScene: true,
        theory: {
          subtitle: "The special Euclidean group — full rigid-body motion",
          overview: [
            "A rigid-body configuration in 3D space requires both position and orientation. The Special Euclidean group SE(3) packages both into a single 4×4 matrix T = [R | p; 0 0 0 | 1], where R ∈ SO(3) is the rotation and p ∈ ℝ³ is the origin position. These are called homogeneous transformation matrices.",
            "The power of this representation is elegant composition. If T_sb describes frame {b} relative to frame {s}, and T_bc describes frame {c} relative to {b}, then T_sc = T_sb · T_bc with ordinary matrix multiplication. This chain works because the bottom row [0 0 0 1] makes it consistent across compositions.",
            "Inversion is also clean: T⁻¹ = [Rᵀ | −Rᵀp; 0 | 1]. To transform a point: p_s = T_sb · [p_b; 1] (using homogeneous coordinates). The interactive scene lets you drag T_sb and see T_sc = T_sb · T_bc update live."
          ],
          formula: "T = \\begin{bmatrix} R & p \\\\ 0 & 1 \\end{bmatrix} \\in SE(3), \\quad T^{-1} = \\begin{bmatrix} R^\\top & -R^\\top p \\\\ 0 & 1 \\end{bmatrix}",
          insights: [
            "SE(3) = ℝ³ ⋊ SO(3): translation and rotation are not independent — order matters",
            "T_AB means: frame {B} expressed relative to frame {A}",
            "Composition: T_AC = T_AB · T_BC (chain rule for frames)",
            "Homogeneous coordinates turn affine (rotation + translation) into pure linear operations",
            "6 DOF: 3 for rotation + 3 for translation; 16 matrix entries, 10 constraints from SE(3) definition"
          ]
        }
      },
      {
        id: "twists",
        title: "Twists & Screw Motions",
        description: "Six-dimensional representation of rigid-body velocity.",
        hasScene: true,
        theory: {
          subtitle: "Screw theory: the geometry of instantaneous rigid-body motion",
          overview: [
            "The instantaneous velocity of a rigid body is described by a twist 𝒱 = (ω, v) ∈ ℝ⁶, where ω ∈ ℝ³ is the angular velocity and v ∈ ℝ³ is the linear velocity of the body frame origin. Twists live in the Lie algebra se(3) of SE(3), represented as 4×4 matrices [𝒱] = [[ω] v; 0 0].",
            "Chasles' theorem states that every rigid-body motion is a screw motion: rotation by θ about an axis combined with translation by hθ along that axis. The screw axis S = (ω̂, v) ∈ ℝ⁶ encodes this; the pitch h = ωᵀv/|ω|² gives translation per radian of rotation. A pure rotation has h = 0; pure translation has |ω| = 0.",
            "Twists come in two flavors — space (𝒱_s) and body (𝒱_b) — depending on whether velocities are expressed in the fixed space frame or the moving body frame. They are related by the adjoint map: 𝒱_s = [Ad_{T_sb}] 𝒱_b. The interactive scene animates a rigid body undergoing screw motion so you can feel the difference between rotation, translation, and screw."
          ],
          formula: "[\\mathcal{V}] = \\begin{bmatrix} [\\omega] & v \\\\ 0 & 0 \\end{bmatrix} \\in se(3), \\quad \\mathcal{V} = \\begin{pmatrix} \\omega \\\\ v \\end{pmatrix} \\in \\mathbb{R}^6",
          insights: [
            "ω is angular velocity; v = ṗ + ω × r_c relates linear velocity to the screw axis point",
            "Pure rotation: v = ω × q (q is any point on the rotation axis); pitch h = 0",
            "Pure translation: ω = 0, v = direction of motion; the 'axis' is at infinity",
            "Space twist 𝒱_s is constant when the screw axis is fixed in space; body twist 𝒱_b is constant when the axis is fixed in the body",
            "The matrix exponential e^{[𝒮]θ} gives the SE(3) transformation after rotating θ radians about screw axis S"
          ]
        }
      },
      {
        id: "exp-coords-se3",
        title: "Exponential Coordinates for SE(3)",
        description: "Six-vector representation of rigid-body displacements.",
        hasScene: false,
        theory: {
          subtitle: "The matrix exponential connects se(3) to SE(3)",
          overview: [
            "Just as SO(3) has exponential coordinates (axis-angle), SE(3) has 6D exponential coordinates. A screw axis S = (ω̂, v) ∈ ℝ⁶ and a displacement θ give T = e^{[S]θ} ∈ SE(3). When ‖ω‖ = 1, the closed-form is: R = e^{[ω̂]θ} and p = (Iθ + (1−cos θ)[ω̂] + (θ−sin θ)[ω̂]²)v.",
            "For pure translation (ω = 0), S = (0, v̂) and T = [I | θv̂; 0 | 1]. The exponential map is bijective near the identity and provides a minimal, singularity-free representation of small displacements.",
            "The logarithm map Log: SE(3) → se(3) recovers S and θ from T. These exponential coordinates underpin the product-of-exponentials formula for forward kinematics, where each joint contributes one exponential factor."
          ],
          formula: "T = e^{[\\mathcal{S}]\\theta} = \\begin{bmatrix} e^{[\\hat{\\omega}]\\theta} & G(\\theta)v \\\\ 0 & 1 \\end{bmatrix},\\quad G(\\theta) = I\\theta + (1-\\cos\\theta)[\\hat{\\omega}] + (\\theta-\\sin\\theta)[\\hat{\\omega}]^2",
          insights: [
            "S = (ω̂, v) encodes the screw axis; θ is the rotation angle (or translation distance if ω=0)",
            "Product of exponentials: T_se(θ) = e^{[S₁]θ₁} ··· e^{[Sₙ]θₙ} T_M (forward kinematics)",
            "Exponential coordinates are singular only at the 2π boundary — far fewer singularities than Euler angles",
            "The adjoint representation Ad_T maps twists between frames: 𝒱_a = Ad_{T_ab} 𝒱_b",
            "Matrix log of T gives the 'geodesic' (shortest screw motion) connecting identity to T"
          ]
        }
      }
    ]
  },

  {
    id: "chapter4",
    number: 4,
    title: "Forward Kinematics",
    topics: [
      {
        id: "poe-space",
        title: "Product of Exponentials (Space Form)",
        description: "FK via screw axes expressed in the fixed space frame.",
        hasScene: true,
        theory: {
          subtitle: "Building the forward kinematics from screw axes",
          overview: [
            "The Product of Exponentials (PoE) formula computes the forward kinematics without Denavit-Hartenberg parameters. For an n-joint robot, the end-effector frame {e} relative to the fixed base {s} is T_se(θ) = e^{[S₁]θ₁} e^{[S₂]θ₂} ··· e^{[Sₙ]θₙ} T_M, where T_M is the end-effector configuration at the home pose (all θᵢ = 0).",
            "Each Sᵢ is the screw axis of joint i expressed in the space frame {s} when the robot is at its home configuration. For a revolute joint with axis direction ω̂ᵢ passing through point qᵢ: Sᵢ = (ω̂ᵢ, −ω̂ᵢ × qᵢ). For a prismatic joint sliding in direction v̂ᵢ: Sᵢ = (0, v̂ᵢ).",
            "The beauty of PoE is its geometric clarity: each joint exponential represents a pure screw displacement applied in sequence. There are no DH parameter tables to look up; you simply identify the joint axes at the home pose and compose exponentials."
          ],
          formula: "T_{se}(\\theta) = e^{[\\mathcal{S}_1]\\theta_1} e^{[\\mathcal{S}_2]\\theta_2} \\cdots e^{[\\mathcal{S}_n]\\theta_n} T_M",
          insights: [
            "T_M is the home configuration — the end-effector frame when all θᵢ = 0",
            "Joint screw axes Sᵢ are fixed in the space frame at the home configuration",
            "Each e^{[Sᵢ]θᵢ} is a pure screw displacement about/along joint i's axis",
            "No DH convention required — just identify axis direction and a point on the axis",
            "Composition works left-to-right: joint 1 acts first on the space frame, joint n acts last"
          ]
        }
      },
      {
        id: "poe-body",
        title: "Product of Exponentials (Body Form)",
        description: "FK via screw axes in the end-effector body frame.",
        hasScene: false,
        theory: {
          subtitle: "The body-frame dual of the space PoE formula",
          overview: [
            "The body form of the PoE expresses joint screw axes in the end-effector body frame {b} at the home configuration, rather than in the space frame. The formula is T_sb(θ) = T_M e^{[B₁]θ₁} e^{[B₂]θ₂} ··· e^{[Bₙ]θₙ}, where Bᵢ is the screw axis of joint i expressed in the body frame at home.",
            "For a revolute joint with world-frame axis ω̂ᵢ through point qᵢ, the body-frame screw axis is Bᵢ = Ad_{T_M⁻¹} Sᵢ. The two formulations are mathematically equivalent and give the same T_se(θ); the choice depends on which frame is more convenient.",
            "The body form is particularly natural for tool-frame calculations: the last joint's body screw axis is just the direction of the last joint in the end-effector frame, which is often trivial to determine from inspection."
          ],
          formula: "T_{sb}(\\theta) = T_M e^{[\\mathcal{B}_1]\\theta_1} e^{[\\mathcal{B}_2]\\theta_2} \\cdots e^{[\\mathcal{B}_n]\\theta_n}",
          insights: [
            "Bᵢ = Ad_{T_M⁻¹} Sᵢ: body axes are related to space axes via the adjoint",
            "Body form multiplies exponentials right-to-left from T_M",
            "Both space and body PoE give the same end-effector configuration T_se",
            "Body axes are more intuitive when the robot's 'natural' description is relative to the tool",
            "Used to derive the body Jacobian directly by differentiating the body PoE"
          ]
        }
      }
    ]
  },

  {
    id: "chapter5",
    number: 5,
    title: "Velocity Kinematics & Statics",
    topics: [
      {
        id: "space-jacobian",
        title: "The Space Jacobian",
        description: "Mapping joint rates to end-effector twist in the space frame.",
        hasScene: true,
        theory: {
          subtitle: "Differential mapping from joint space to task space",
          overview: [
            "The Space Jacobian J_s(θ) is a 6×n matrix that relates joint velocities θ̇ to the end-effector spatial twist 𝒱_s: 𝒱_s = J_s(θ) θ̇. Each column J_sᵢ is the screw axis of joint i expressed in the space frame for the current configuration θ. For a revolute joint i, J_sᵢ = Ad_{e^{[S₁]θ₁}···e^{[Sᵢ₋₁]θᵢ₋₁}} Sᵢ.",
            "The Jacobian encodes how joint motion maps to end-effector motion at the current configuration. Near a singular configuration, columns of J_s become linearly dependent — the end-effector loses mobility in certain directions. Singularities are the configurations where rank(J_s) < 6.",
            "Statics duality: joint torques τ and end-effector wrench F are related by τ = J_sᵀ F. This means at a singularity, the robot can exert unbounded forces in the direction of lost mobility while requiring zero torque — a useful property for assembly tasks but dangerous near joint limits."
          ],
          formula: "\\mathcal{V}_s = J_s(\\theta)\\dot{\\theta}, \\quad J_{si} = \\text{Ad}_{e^{[\\mathcal{S}_1]\\theta_1}\\cdots e^{[\\mathcal{S}_{i-1}]\\theta_{i-1}}} \\mathcal{S}_i",
          insights: [
            "Column i of J_s is the current space-frame screw axis of joint i",
            "Singularities: rank(J_s) < 6 — end-effector loses some velocity directions",
            "At boundary of workspace or at arm-straight/arm-folded configurations",
            "Pseudo-inverse J†= Jᵀ(JJᵀ)⁻¹ gives minimum-norm joint velocities for a desired twist",
            "Statics duality: τ = Jᵀ F — the transpose Jacobian maps wrenches to joint torques"
          ]
        }
      },
      {
        id: "body-jacobian",
        title: "The Body Jacobian",
        description: "Joint rates mapped to the end-effector twist in the body frame.",
        hasScene: false,
        theory: {
          subtitle: "The Jacobian expressed in the moving end-effector frame",
          overview: [
            "The Body Jacobian J_b(θ) maps joint velocities to the body twist 𝒱_b (end-effector velocity expressed in the end-effector frame): 𝒱_b = J_b(θ) θ̇. Column J_bᵢ = Ad_{(e^{[Bᵢ]θᵢ}···e^{[Bₙ]θₙ})⁻¹} Bᵢ — the body screw axis of joint i transformed to the current end-effector frame.",
            "Space and body Jacobians are related by the adjoint: J_b = Ad_{T_sb⁻¹} J_s. They encode the same kinematic information from different perspectives. The body Jacobian is often more natural for task-frame control and for expressing wrenches applied at the end-effector.",
            "The linear sub-Jacobian J_v (the bottom 3 rows of J_b or J_s) maps joint velocities to linear velocity only. The angular sub-Jacobian J_ω (top 3 rows) maps to angular velocity. These sub-Jacobians are used to analyze specific velocity capabilities."
          ],
          formula: "\\mathcal{V}_b = J_b(\\theta)\\dot{\\theta}, \\quad J_b = [\\text{Ad}_{T_{sb}}]^{-1} J_s",
          insights: [
            "Body Jacobian columns are screw axes expressed in the current end-effector frame",
            "J_b and J_s encode identical kinematic information — just in different frames",
            "Body Jacobian is natural for wrench analysis and compliance control",
            "Manipulability ellipsoid is the same for both (up to orientation)",
            "Configuration q is singular iff J_b(q) is rank-deficient — same singularities as J_s"
          ]
        }
      },
      {
        id: "singularities",
        title: "Kinematic Singularities",
        description: "Configurations where the robot loses end-effector mobility.",
        hasScene: false,
        theory: {
          subtitle: "Where Jacobians lose rank and end-effectors lose freedom",
          overview: [
            "A configuration θ is singular if rank(J(θ)) < 6 (for a 6-DOF arm) or, more generally, if the Jacobian drops below its generic rank. At a singular configuration, certain end-effector velocities cannot be achieved regardless of joint velocities — the robot is momentarily 'stuck' in those directions.",
            "For serial manipulators, singularities fall into two categories: (1) Workspace-boundary singularities — when the arm is fully extended or fully folded, reaching the boundary of the reachable workspace. (2) Interior singularities — when multiple joint axes become collinear or coplanar inside the workspace.",
            "Singularities are important for path planning (avoid them if continuous motion is needed), for control (the pseudo-inverse becomes ill-conditioned), and for statics (force amplification is possible — the robot can exert very large forces in singular directions with small joint torques)."
          ],
          formula: "\\theta^* \\text{ is singular} \\iff \\det(J_s J_s^\\top) = 0",
          insights: [
            "det(J Jᵀ) = 0 at a singularity; this is the manipulability measure going to zero",
            "Inverse kinematics breaks down at singular configurations — infinitely many or no solutions nearby",
            "Resolved-rate control (θ̇ = J⁻¹ 𝒱_d) becomes unstable near singularities",
            "Damped least squares: θ̇ = Jᵀ(JJᵀ + λ²I)⁻¹ 𝒱_d regularizes the singularity",
            "Redundant robots (n > 6 DOF) can often avoid singularities using null-space motion"
          ]
        }
      },
      {
        id: "manipulability",
        title: "Manipulability Ellipsoids",
        description: "Visualizing directional velocity capability at a configuration.",
        hasScene: false,
        theory: {
          subtitle: "Geometric measure of kinematic performance",
          overview: [
            "The manipulability ellipsoid visualizes the set of end-effector twists achievable when ‖θ̇‖ ≤ 1. It is the image of the unit ball in joint-velocity space under the Jacobian map: {J_v θ̇ : ‖θ̇‖ ≤ 1}. The shape of the ellipsoid (its principal axes and radii) reveals in which directions the robot can move quickly and in which it is constrained.",
            "The ellipsoid axes are the singular vectors of J_v (the linear sub-Jacobian), with lengths equal to the singular values σ₁ ≥ σ₂ ≥ σ₃. A large σᵢ means fast motion is possible in that direction; σᵢ near zero indicates near-singularity in that direction. The scalar manipulability μ = √det(J_v J_vᵀ) = σ₁σ₂σ₃ captures the 'volume' of the ellipsoid.",
            "Configuration-dependent shape changes are dramatic. Near singularities, the ellipsoid collapses to a disk or line. At the most dexterous configurations (maximizing μ), the ellipsoid approaches a sphere — equal velocity capability in all directions. This motivates motion planning to avoid singularities and maximize μ along a trajectory."
          ],
          formula: "\\mu(\\theta) = \\sqrt{\\det(J_v J_v^\\top)} = \\sigma_1 \\sigma_2 \\sigma_3",
          insights: [
            "Ellipsoid principal radii = singular values σᵢ of the linear Jacobian J_v",
            "μ = 0 at a singularity; μ = σ₁ = σ₂ = σ₃ at a perfectly isotropic configuration",
            "Force ellipsoid (dual) is the inverse: large velocity → small force, and vice versa",
            "Condition number σ_max/σ_min measures isotropy; small number → well-conditioned",
            "Maximizing μ along a trajectory is one criterion for motion quality"
          ]
        }
      }
    ]
  },

  {
    id: "chapter6",
    number: 6,
    title: "Inverse Kinematics",
    topics: [
      {
        id: "analytic-ik",
        title: "Analytic Inverse Kinematics",
        description: "Closed-form solutions for specific robot geometries.",
        hasScene: false,
        theory: {
          subtitle: "Closed-form joint angles from end-effector pose",
          overview: [
            "Inverse kinematics (IK) asks: given a desired end-effector configuration T_sd ∈ SE(3), what joint angles θ achieve it? For robots with special geometry — particularly those with three concurrent revolute wrist axes (like most industrial robots) — analytic (closed-form) solutions exist.",
            "The most common approach decouples position and orientation: first solve for the wrist center position (3 equations, 3 unknowns), then solve for wrist orientation. The wrist center is at p_wc = p_d − d_ee R_d ẑ, where d_ee is the distance from wrist to end-effector. The first three joints position the wrist; the last three orient the tool.",
            "A 6-DOF robot typically has up to 16 solutions (8 in practice for wrists with angle limits). The 'elbow-up/elbow-down' and 'wrist-flip' configurations are the familiar discrete choices. Analytic IK is fast (microseconds) and exact, but only works for specific geometric configurations."
          ],
          formula: "T_{sd} = T_{se}(\\theta) \\implies \\theta = \\text{IK}(T_{sd})",
          insights: [
            "Analytic IK only exists for robots with special geometry (e.g., 3 concurrent wrist axes)",
            "Typically 2 elbow configurations × 2 wrist configurations = 4 or more solutions",
            "Decoupled approach: solve position for first 3 joints, then orientation for last 3",
            "Cosine law is the workhorse: c = cos(θ₂) = (r² − a² − b²)/(2ab)",
            "Choose among multiple solutions using continuity, joint limit checking, or manipulability"
          ]
        }
      },
      {
        id: "numerical-ik",
        title: "Numerical Inverse Kinematics",
        description: "Newton-Raphson iteration on the Jacobian for arbitrary robots.",
        hasScene: false,
        theory: {
          subtitle: "Iterative convergence using the Jacobian pseudo-inverse",
          overview: [
            "Numerical IK uses iterative refinement to find joint angles satisfying T_se(θ) ≈ T_sd. The Newton-Raphson approach: given current θ, compute the error twist 𝒱 = Log(T_se(θ)⁻¹ T_sd), then update θ ← θ + J†(θ) 𝒱, where J† is the pseudo-inverse of the Jacobian.",
            "The error twist 𝒱 lives in se(3) and represents the 'remaining screw motion' needed to reach the target. At each iteration, the algorithm takes a linearized step toward the goal. Convergence is typically quadratic near the solution but may fail near singularities or if the initial guess is far from the target.",
            "Damped least squares (Levenberg-Marquardt) replaces J† with Jᵀ(JJᵀ + λ²I)⁻¹ to regularize near singularities. Task priority and null-space projection allow additional objectives (e.g., joint limit avoidance) while satisfying the primary IK task."
          ],
          formula: "\\theta_{k+1} = \\theta_k + J^\\dagger(\\theta_k)\\, [\\mathcal{V}], \\quad [\\mathcal{V}] = \\log\\bigl(T_{se}(\\theta_k)^{-1} T_{sd}\\bigr)",
          insights: [
            "Log(T_se⁻¹ T_sd) gives the remaining twist error in the end-effector frame",
            "Convergence criterion: ‖ω_err‖ < ε_ω and ‖v_err‖ < ε_v",
            "Convergence is not guaranteed — depends on initial guess and robot geometry",
            "Null space of J can be used for secondary objectives: avoid joint limits, maximize μ",
            "Damped LS: θ̇ = Jᵀ(JJᵀ + λ²I)⁻¹ 𝒱 — always solvable, even at singularities"
          ]
        }
      }
    ]
  },

  {
    id: "chapter7",
    number: 7,
    title: "Kinematics of Closed Chains",
    topics: [
      {
        id: "parallel-mechanisms",
        title: "Parallel Mechanisms",
        description: "Multiple kinematic chains connecting base to end-effector.",
        hasScene: false,
        theory: {
          subtitle: "Closed-loop kinematic structures and constraint equations",
          overview: [
            "A parallel mechanism has multiple kinematic chains connecting the fixed base to the end-effector, forming closed loops. Unlike serial robots, the actuators are distributed across all chains, giving high stiffness, precision, and load capacity. The Stewart-Gough platform (6 legs, 6 DOF) is the canonical example.",
            "The kinematics of closed chains involve loop-closure constraints: the product of transformations around any loop must equal the identity. These constraint equations relate actuated joint variables to the end-effector pose in a nonlinear system. Forward kinematics is hard (solve a system of equations); inverse kinematics is typically easy (each leg can be computed independently).",
            "The Jacobian of a parallel mechanism relates leg velocities to end-effector twist and has a parallel structure: J_parallel = J_a⁻¹ J_b, where J_a captures the actuated-joint velocities and J_b the passive joints. Singularities now come in two types: leg singularities (a single leg becomes singular) and architecture singularities (all legs conspire to lose a DOF)."
          ],
          formula: "T_{\\text{leg}_i}(\\theta^{(i)}) = T_{\\text{end-effector}} \\quad \\forall i \\implies f(q, T) = 0",
          insights: [
            "Parallel manipulators: high stiffness, small workspace, hard FK / easy IK",
            "Serial manipulators: large workspace, lower stiffness, easy FK / hard IK",
            "Loop-closure constraints are nonlinear equations that must be solved numerically in general",
            "Stewart platform: 6 linearly actuated legs → can achieve arbitrary SE(3) motion in a bounded workspace",
            "Two types of singularities: leg (serial chain) and parallel (architectural) — both must be avoided"
          ]
        }
      },
      {
        id: "stewart-platform",
        title: "Stewart-Gough Platform",
        description: "The canonical 6-DOF parallel manipulator.",
        hasScene: false,
        theory: {
          subtitle: "Six linearly actuated legs for full 6-DOF motion",
          overview: [
            "The Stewart-Gough platform consists of a fixed base and a moving platform connected by six extensible legs, each with universal joints at both ends. By controlling leg lengths, any position and orientation (within the workspace) can be achieved — making it a 6-DOF parallel robot with very high stiffness.",
            "Inverse kinematics is trivial: given a desired platform pose T, the required length of each leg is simply the distance between the base attachment point and the platform attachment point transformed by T. This is computed in closed form in milliseconds.",
            "Forward kinematics is hard: given six leg lengths, find the platform pose. This requires solving a degree-16 polynomial system. In practice, numerical iteration starting from the previous configuration is used. Workspace and singularity analysis are complex but critical for flight simulators, machine tools, and precision positioning stages."
          ],
          formula: "l_i = \\|\\, p + R\\, b_i - a_i \\,\\|, \\quad i = 1,\\ldots,6",
          insights: [
            "Inverse kinematics: leg length = ‖p + R·b_i − a_i‖ (trivially computed)",
            "Forward kinematics: solve 16th-degree polynomial — up to 40 real solutions in principle",
            "Used in: flight simulators, hexapod machine tools, telescope mirrors, earthquake simulation",
            "High stiffness because actuator forces distribute across 6 parallel load paths",
            "Workspace is a complex 6D region — difficult to visualize; typically a bubble around the home pose"
          ]
        }
      }
    ]
  },

  {
    id: "chapter8",
    number: 8,
    title: "Dynamics",
    topics: [
      {
        id: "lagrangian",
        title: "Lagrangian Dynamics",
        description: "Energy-based equations of motion for robot manipulators.",
        hasScene: false,
        theory: {
          subtitle: "From kinetic and potential energy to equations of motion",
          overview: [
            "The Lagrangian L = T − V (kinetic minus potential energy) yields the equations of motion via the Euler-Lagrange equations: d/dt(∂L/∂θ̇) − ∂L/∂θ = τ. For a robot manipulator, kinetic energy T = ½ θ̇ᵀ M(θ) θ̇ where M(θ) is the configuration-dependent mass matrix, and potential energy V = Σ mᵢ g hᵢ(θ).",
            "Expanding the Euler-Lagrange equations gives the standard manipulator equation: M(θ)θ̈ + C(θ,θ̇)θ̇ + g(θ) = τ, where C captures Coriolis and centripetal effects and g is the gravity vector. Each term has a clear physical interpretation: M θ̈ is inertial reaction, C θ̇ is velocity-dependent forces, and g is gravitational torque.",
            "Properties of the manipulator equation: (1) M(θ) is symmetric positive-definite. (2) Ṁ − 2C is skew-symmetric (energy passivity). (3) The equation is linear in the dynamic parameters (masses, inertia tensors) — enabling parameter identification from data."
          ],
          formula: "M(\\theta)\\ddot{\\theta} + C(\\theta, \\dot{\\theta})\\dot{\\theta} + g(\\theta) = \\tau",
          insights: [
            "M(θ) is the mass matrix — symmetric positive-definite, configuration-dependent",
            "C(θ,θ̇)θ̇ contains Coriolis and centripetal terms — nonlinear in velocities",
            "g(θ) = ∂V/∂θ: gradient of potential energy w.r.t. joint angles",
            "Linear in dynamic parameters: M(θ)θ̈ + ... = Y(θ,θ̇,θ̈) Φ, useful for adaptive control",
            "Passivity: ṁ − 2C is skew-symmetric → system is passive (energy can only be added via torques)"
          ]
        }
      },
      {
        id: "mass-matrix",
        title: "Mass Matrix & Inertia",
        description: "Configuration-dependent resistance to acceleration.",
        hasScene: false,
        theory: {
          subtitle: "The configuration-dependent inertia of a robot arm",
          overview: [
            "The mass matrix M(θ) ∈ ℝⁿˣⁿ encodes how much torque is needed to accelerate each joint, and how motion of one joint induces reaction torques at other joints. Diagonal entry Mᵢᵢ(θ) is the effective inertia of joint i alone; off-diagonal Mᵢⱼ(θ) is the coupling between joints i and j.",
            "Computing M requires summing the contribution of each link: M(θ) = Σᵢ Jᵢᵀ (link i Gᵢ) Jᵢ, where Gᵢ is the 6×6 spatial inertia matrix of link i and Jᵢ is the geometric Jacobian to link i's center of mass. Large distal masses (heavy wrist) contribute significantly to M and degrade dynamic performance.",
            "The mass matrix is configuration-dependent: as the arm extends, certain inertias increase (lever-arm effect); as it folds, they decrease. Controlling the manipulator as if M were constant leads to inertia mismatch — a fundamental challenge in robot control."
          ],
          formula: "M(\\theta) = \\sum_{i=1}^{n} J_i^\\top(\\theta) \\mathcal{G}_i J_i(\\theta)",
          insights: [
            "Mᵢᵢ: effective inertia at joint i (self-coupling term)",
            "Mᵢⱼ: dynamic coupling between joints i and j (off-diagonal terms)",
            "‖M‖ varies with configuration — harder to control fast motions at extended configurations",
            "Condition number of M indicates how much coupling there is between joints",
            "Computed-torque control cancels M-dependent effects: τ = M(θ)θ̈_d + C θ̇ + g"
          ]
        }
      },
      {
        id: "recursive-ne",
        title: "Recursive Newton-Euler",
        description: "Efficient O(n) algorithm for computing joint torques.",
        hasScene: false,
        theory: {
          subtitle: "Computing inverse dynamics via forward/backward recursion",
          overview: [
            "The Recursive Newton-Euler (RNE) algorithm computes inverse dynamics — given θ, θ̇, θ̈, find the joint torques τ — in O(n) time (linear in the number of joints). It proceeds in two passes: a forward pass propagating velocities and accelerations from base to tip, and a backward pass propagating forces and moments from tip to base.",
            "Forward pass: For each link from 1 to n, compute: angular velocity ωᵢ = ωᵢ₋₁ + Rᵢᵀ ẑᵢ θ̇ᵢ; angular acceleration α_i; linear acceleration aᵢ. Backward pass: For each link from n to 1, compute net force and moment required to produce the computed accelerations, then project onto the joint axis to get torque.",
            "RNE is the basis for real-time dynamics computation in robot controllers and simulators. The same algorithm can compute forward dynamics (find θ̈ given τ) by combining RNE with an inertia matrix factorization, and it naturally handles branching kinematic trees."
          ],
          formula: "\\tau_i = \\mathcal{F}_i^\\top \\mathcal{A}_i \\quad \\text{(torque = wrench dot joint axis)}",
          insights: [
            "Forward pass: propagate velocities and accelerations from base to tip (O(n))",
            "Backward pass: propagate wrenches from tip to base (O(n))",
            "Total cost O(n): vastly more efficient than Lagrangian formulation O(n⁴)",
            "Handles gravity naturally by setting base acceleration = −g (trick for static analysis)",
            "Used for: real-time control, simulation, parameter identification"
          ]
        }
      },
      {
        id: "gravity-coriolis",
        title: "Gravity, Coriolis & Centripetal",
        description: "The non-inertial terms in the manipulator equation.",
        hasScene: false,
        theory: {
          subtitle: "Velocity-dependent and configuration-dependent force terms",
          overview: [
            "Beyond the inertial term M(θ)θ̈, the manipulator equation has two other terms. The Coriolis/centripetal matrix C(θ,θ̇) generates velocity-dependent torques. Coriolis terms (∝ θ̇ᵢθ̇ⱼ, i≠j) arise from the coupling between joint motions; centripetal terms (∝ θ̇ᵢ²) arise from rotating reference frames. Both vanish when the robot is stationary.",
            "The gravity vector g(θ) = ∂V/∂θ is the gradient of gravitational potential energy with respect to joint angles. It determines how much torque each joint must exert to hold the configuration against gravity. g(θ) is configuration-dependent: a horizontal arm requires maximum support torque; a vertical arm can be gravity-compensated almost trivially.",
            "In practice, gravity compensation is the most important dynamic compensation. Controllers that add −g(θ) to the command torque make the robot feel 'weightless' to the joint-space controller. Coriolis compensation matters only at high velocities and is often neglected at low speeds."
          ],
          formula: "\\tau = M(\\theta)\\ddot{\\theta} + C(\\theta,\\dot{\\theta})\\dot{\\theta} + g(\\theta)",
          insights: [
            "g(θ): must be compensated at all times to hold any static pose",
            "Coriolis torques ∝ θ̇² — significant only at high joint speeds",
            "Gravity compensation: τ_cmd = τ_PD − g(θ) makes joint appear weightless",
            "C(θ,θ̇)θ̇ can be computed from M via Christoffel symbols: Cᵢⱼₖ = ½(∂Mᵢⱼ/∂θₖ + ∂Mᵢₖ/∂θⱼ − ∂Mⱼₖ/∂θᵢ)",
            "Energy: d/dt(½θ̇ᵀMθ̇ + V) = θ̇ᵀτ — work done equals change in total energy"
          ]
        }
      }
    ]
  },

  {
    id: "chapter9",
    number: 9,
    title: "Trajectory Generation",
    topics: [
      {
        id: "point-to-point",
        title: "Point-to-Point Trajectories",
        description: "Smooth motion profiles between two configurations.",
        hasScene: false,
        theory: {
          subtitle: "Connecting start and goal with smooth time-parameterized paths",
          overview: [
            "A point-to-point trajectory specifies motion from a start configuration θ_start to a goal θ_goal over a time interval [0, T]. The trajectory θ(t) = θ_start + s(t)(θ_goal − θ_start) factors into a geometric path and a time scaling s(t) ∈ [0,1] with s(0)=0, s(T)=1, ṡ(0)=ṡ(T)=0 (rest-to-rest).",
            "The simplest non-trivial time scaling is the cubic polynomial s(t) = 3(t/T)² − 2(t/T)³, which gives zero velocity at start and end. A quintic polynomial adds zero acceleration constraints, giving smoother motor commands. Trapezoidal velocity profiles are also common in industrial practice: constant acceleration → constant velocity → constant deceleration.",
            "For SE(3) trajectories, the path is parameterized in the task space. A straight-line Cartesian path: T(s) = T_start exp([ΔS]s), where ΔS = Log(T_start⁻¹ T_goal) is the screw displacement. This geodesic path moves along the 'straightest' screw between two configurations."
          ],
          formula: "\\theta(t) = \\theta_s + s(t)(\\theta_g - \\theta_s), \\quad s(t) = 3\\left(\\frac{t}{T}\\right)^2 - 2\\left(\\frac{t}{T}\\right)^3",
          insights: [
            "Cubic polynomial: zero velocity at endpoints; minimum energy for rest-to-rest",
            "Quintic polynomial adds zero acceleration at endpoints — smoother torque commands",
            "Trapezoidal profile: common in industry; simple to implement but has velocity discontinuities",
            "Time-optimal scaling: minimize T subject to joint velocity/acceleration/torque limits",
            "Cartesian path interpolation requires IK at each point — care needed near singularities"
          ]
        }
      },
      {
        id: "time-scaling",
        title: "Time Scaling",
        description: "Parameterizing how fast a path is traversed.",
        hasScene: false,
        theory: {
          subtitle: "Separating path geometry from traversal speed",
          overview: [
            "Time scaling decouples the geometric path θ(s) from when each point is reached. Given a path parameterized by s ∈ [0,1], the time scaling s(t) determines the speed profile. The joint velocities are θ̇ = (dθ/ds) ṡ and accelerations θ̈ = (dθ/ds) s̈ + (d²θ/ds²) ṡ².",
            "The joint torques required are τ = M(θ)(dθ/ds)s̈ + [M(θ)(d²θ/ds²) + C(θ,θ̇)(dθ/ds)]ṡ² + g(θ). This can be rewritten as τ = m(s)s̈ + c(s)ṡ² + g(s), a scalar second-order ODE in s(t). Joint actuator limits |τᵢ| ≤ τ_max impose bounds on s̈ and ṡ at each s.",
            "The time-optimal scaling problem maximizes traversal speed subject to torque and velocity limits. The solution lies on the boundary of the feasible (ṡ, s̈) region and can be computed numerically via the 'phase plane' method, switching between maximum and minimum acceleration."
          ],
          formula: "\\tau = m(s)\\ddot{s} + c(s)\\dot{s}^2 + g(s)",
          insights: [
            "Decoupling path and timing simplifies trajectory design",
            "Phase plane (ṡ vs s) is the key tool for time-optimal scaling",
            "Minimum-time solution: always at maximum acceleration or deceleration",
            "Velocity limits create horizontal bands in the phase plane",
            "Torque limits create parabolic boundaries — must stay within the feasible region"
          ]
        }
      },
      {
        id: "via-points",
        title: "Via-Points & Multi-Segment",
        description: "Passing through intermediate waypoints with continuity.",
        hasScene: false,
        theory: {
          subtitle: "Smooth multi-point trajectories",
          overview: [
            "For many tasks (avoid obstacles, follow a surface), the robot must pass through intermediate via-points with prescribed timing. The challenge is achieving smooth motion (continuity in velocity and acceleration) through each via-point without coming to a rest.",
            "Cubic splines connect segments by enforcing matching derivatives at each via-point. Given n via-points, a C² cubic spline solves a tridiagonal linear system for the n+1 cubic polynomials. The result is smooth position, velocity, and acceleration through all intermediate points.",
            "An alternative is the 'double-S velocity profile' (S-curve), which uses constant-jerk segments to achieve smooth velocity transitions. This is the most common profile in industrial robots: it respects velocity, acceleration, and jerk limits simultaneously."
          ],
          formula: "\\theta(t) \\in C^2: \\text{ position, velocity, acceleration continuous through via-points}",
          insights: [
            "C¹ continuity: matching velocity at via-points (first derivative continuous)",
            "C² continuity: matching acceleration too — requires cubic splines or higher order",
            "Blending: slow down near via-point, blend with polynomial — avoids sharp corners",
            "Cubic splines: solve tridiagonal system for all segments simultaneously",
            "Jerk (dτ/dt) bounds are important for mechanical longevity and smooth motion quality"
          ]
        }
      }
    ]
  },

  {
    id: "chapter10",
    number: 10,
    title: "Motion Planning",
    topics: [
      {
        id: "cspace-obstacles",
        title: "C-Space Obstacles",
        description: "Mapping workspace obstacles into configuration space.",
        hasScene: false,
        theory: {
          subtitle: "The obstacle region in configuration space",
          overview: [
            "The C-space obstacle region C_obs is the set of all configurations q where the robot body intersects an obstacle or the robot's own links collide. Motion planning reduces to finding a path from q_start to q_goal that stays in C_free = C \\ C_obs.",
            "For simple geometries (polygonal robot + polygonal obstacles in 2D), C_obs can be computed exactly using Minkowski sums. In 3D, this computation is generally intractable — C_obs is a complex 6D region. Therefore, planners query collision in C_obs rather than explicitly computing it.",
            "C_obs has a complicated shape: it includes narrow passages (difficult to find a path through), cusps (where multiple obstacle boundaries meet), and sometimes disconnected components (the start and goal may be in different connected components of C_free, making planning impossible)."
          ],
          formula: "\\mathcal{C}_{\\text{obs}} = \\{q \\in \\mathcal{C} : \\mathcal{A}(q) \\cap \\mathcal{O} \\neq \\emptyset\\}",
          insights: [
            "A(q) is the robot body at configuration q; O is the union of all obstacles",
            "C_obs is generally non-convex, high-dimensional, and hard to compute explicitly",
            "Collision checking (point query: is q ∈ C_obs?) is the key primitive for samplers",
            "Narrow passages in C_obs are the hardest part for sampling-based planners",
            "Planning fails if start or goal are in C_obs, or if no path exists in C_free"
          ]
        }
      },
      {
        id: "prm",
        title: "Probabilistic Roadmap (PRM)",
        description: "Sampling C-space to build a reusable roadmap.",
        hasScene: false,
        theory: {
          subtitle: "Building a graph in C-free by random sampling",
          overview: [
            "PRM samples random configurations from C, checks each for collision, retains those in C_free, and connects nearby samples with local paths. The result is a graph (roadmap) in C_free that can be queried for start-to-goal paths. PRM is multi-query: once built, the roadmap handles many queries without resampling.",
            "The learning phase samples N configurations and attempts to connect each to its k nearest neighbors using a local planner (often straight-line interpolation). The query phase adds start/goal to the roadmap and runs a graph search (Dijkstra, A*). PRM is probabilistically complete: as N → ∞, if a path exists it will be found.",
            "Weaknesses: (1) Narrow passages — rare to sample inside them; addressed by bridge test or visibility PRM. (2) Non-uniform coverage — dense obstacles create empty regions. (3) Memory: roadmap grows with N. Extensions (PRM*) add asymptotic optimality."
          ],
          formula: "V = \\{q_i \\in \\mathcal{C}_{\\text{free}}\\}, \\quad E = \\{(q_i, q_j) : \\text{local path collision-free}\\}",
          insights: [
            "PRM is probabilistically complete — finds a path if one exists as samples → ∞",
            "Local planner checks edge collision; typically straight-line in C-space",
            "k-nearest neighbor connection: typical k = log(n) for PRM*",
            "Bottleneck: narrow passage sampling; mitigated by bridge sampling, Gaussian sampling",
            "Best for multi-query scenarios where the environment is static"
          ]
        }
      },
      {
        id: "rrt",
        title: "Rapidly-Exploring Random Trees",
        description: "Single-query planning by growing a tree toward random samples.",
        hasScene: false,
        theory: {
          subtitle: "Incremental tree growth for single-query motion planning",
          overview: [
            "RRT grows a tree rooted at q_start by repeatedly: (1) sample a random q_rand from C, (2) find the nearest tree node q_near, (3) extend from q_near toward q_rand by a step size ε to q_new, (4) add q_new to the tree if the path is collision-free. The tree rapidly fills C_free.",
            "RRT is single-query: it finds a path from start to goal without a pre-built roadmap. The tree structure biases growth toward unexplored regions of C_free. When q_rand is occasionally set to q_goal (goal bias), the tree is attracted toward the goal. Planning terminates when the tree reaches within ε of q_goal.",
            "RRT-Connect runs two trees (from start and goal) growing toward each other and attempting to connect. RRT* asymptotically optimizes the path by rewiring the tree using cost functions, at the expense of higher computation. These algorithms are the standard for manipulation, drone, and autonomous car planning."
          ],
          formula: "q_{\\text{new}} = q_{\\text{near}} + \\varepsilon \\frac{q_{\\text{rand}} - q_{\\text{near}}}{\\|q_{\\text{rand}} - q_{\\text{near}}\\|}",
          insights: [
            "RRT is probabilistically complete: with infinite time, finds any existing path",
            "Voronoi bias: large unexplored regions attract samples → exploration is uniform",
            "Goal bias: sample q_goal with probability p_goal to attract the tree toward it",
            "RRT* achieves asymptotic optimality: cost → optimal as samples → ∞",
            "Kinodynamic RRT extends to systems with dynamics (ẋ = f(x,u)), replacing ε-step with simulation"
          ]
        }
      },
      {
        id: "potential-fields",
        title: "Potential Fields",
        description: "Gradient descent on attractive/repulsive potential functions.",
        hasScene: false,
        theory: {
          subtitle: "Treating goal attraction and obstacle repulsion as a force field",
          overview: [
            "Potential field methods define a scalar function U(q) = U_att(q) + U_rep(q) over C-space. The attractive term U_att pulls the robot toward the goal (e.g., parabolic well); the repulsive terms U_rep push it away from obstacles. The robot moves by gradient descent: τ = −∂U/∂q.",
            "The method is reactive and computationally cheap — no roadmap needed, just evaluate U at the current q. It works well for smooth, unconstrained environments. However, it has a fundamental flaw: local minima. The robot can get stuck in a local minimum of U that is not the goal, especially in cluttered environments.",
            "Harmonic functions as potentials (Laplace's equation) guarantee no local minima in free space but require solving a PDE over the whole C-space. Navigation functions achieve global minima only at the goal, but their construction is non-trivial for arbitrary environments."
          ],
          formula: "U(q) = \\underbrace{\\tfrac{1}{2}k_a \\|q - q_g\\|^2}_{\\text{attractive}} + \\sum_i \\underbrace{\\tfrac{1}{2}k_r \\left(\\tfrac{1}{d_i} - \\tfrac{1}{d_0}\\right)^2}_{\\text{repulsive}}",
          insights: [
            "Simple to implement, runs in real time — used in reactive collision avoidance",
            "Local minima are the fundamental weakness — not complete in general",
            "Repulsive potential only active within distance d₀ of obstacle",
            "Oscillation in narrow passages is a known failure mode",
            "Navigation functions: specially designed potentials with no local minima — theoretically sound but hard to construct"
          ]
        }
      }
    ]
  },

  {
    id: "chapter11",
    number: 11,
    title: "Robot Control",
    topics: [
      {
        id: "joint-space-control",
        title: "Joint Space Control",
        description: "PD with feedforward gravity and dynamics compensation.",
        hasScene: false,
        theory: {
          subtitle: "Controlling joint positions and velocities",
          overview: [
            "The simplest robot controller is independent joint PD: τᵢ = Kp,ᵢ(θ_d,ᵢ − θᵢ) + Kd,ᵢ(θ̇_d,ᵢ − θ̇ᵢ). Treating each joint as independent ignores coupling (mass matrix, Coriolis) but works adequately at low speeds with high gains. The steady-state error under gravity is eliminated by adding gravity compensation: τ = τ_PD + g(θ).",
            "Computed-torque control (CTC) achieves exact linearization: τ = M(θ)θ̈_d + C(θ,θ̇)θ̇ + g(θ). If the dynamics model is perfect, this reduces the closed-loop system to n decoupled double integrators, which are easily controlled by PD. With model error ΔM, ΔC, Δg, a residual disturbance remains.",
            "Passivity-based control exploits the passivity property of the manipulator dynamics to design stable controllers without requiring exact cancellation. The PD+ controller τ = Kp e + Kd ė − C(θ,ė)e + g(θ) (where e = θ_d − θ) is globally asymptotically stable under certain conditions."
          ],
          formula: "\\tau = M(\\theta)\\ddot{\\theta}_d + C(\\theta, \\dot{\\theta})\\dot{\\theta} + g(\\theta) + K_p(\\theta_d - \\theta) + K_d(\\dot{\\theta}_d - \\dot{\\theta})",
          insights: [
            "PD alone: stable but steady-state error under gravity; add g(θ) feedforward to fix",
            "Computed-torque: exact linearization → decoupled double integrators",
            "Requires accurate dynamics model M, C, g — robot manufacturers calibrate these carefully",
            "High gains risk instability with joint flexibility or sensor noise",
            "Integral term (PID) eliminates steady-state error under constant disturbances"
          ]
        }
      },
      {
        id: "task-space-control",
        title: "Task Space Control",
        description: "Controlling end-effector position and orientation directly.",
        hasScene: false,
        theory: {
          subtitle: "Operational space control and resolved-rate methods",
          overview: [
            "Task-space (operational-space) control commands joint torques based on end-effector error in SE(3), bypassing the need for IK. The Cartesian error 𝒱_d − J θ̇ = Cartesian velocity error is fed into a PD law in task space, then the Jacobian transpose maps task-space forces to joint torques.",
            "The operational-space controller due to Khatib is: τ = Jᵀ[Λ(q)Ẍ_d + μ(q,q̇) + p(q)] + (I − Jᵀ(JM⁻¹Jᵀ)⁻¹JM⁻¹)τ_null, where Λ is the task-space inertia, μ the task-space Coriolis, and the null-space term allows secondary objectives.",
            "Resolved-rate control θ̇ = J†(θ) 𝒱_d is simpler: it directly maps desired task velocity to joint velocity. Numerically integrating gives joint trajectories. This is the workhorse of teleoperation and visual servoing. Near singularities, damped least squares prevents velocity blowup."
          ],
          formula: "\\tau = J^\\top \\left( K_p X_e + K_d \\dot{X}_e \\right) + g(\\theta)",
          insights: [
            "Task-space control lets you specify goals in end-effector coordinates — more intuitive",
            "No explicit IK needed — the controller implicitly inverts kinematics via the Jacobian",
            "Near singularities: task-space inertia Λ becomes ill-conditioned — regularize",
            "Null-space projection: redundant joints can simultaneously optimize secondary criteria",
            "Visual servoing: measure X from camera, compute error X_e, close loop in image space"
          ]
        }
      },
      {
        id: "force-control",
        title: "Force Control",
        description: "Controlling contact forces and compliant interaction.",
        hasScene: false,
        theory: {
          subtitle: "Impedance, admittance, and hybrid force-motion control",
          overview: [
            "When a robot contacts a surface, pure position control generates unbounded forces (rigid body + position error = large force). Force control explicitly regulates the forces applied to the environment. Impedance control targets a dynamic relationship between end-effector position error and contact force: F = K(X − X_d) + B(Ẋ − Ẋ_d) + MẌ.",
            "Hybrid force-motion control partitions task space into constrained directions (where force is controlled) and unconstrained directions (where motion is controlled). For surface following: motion control in the tangential plane, force control normal to the surface. A selection matrix S identifies the constrained subspace.",
            "Admittance control (for rigid robots): measure the force at the end-effector with a wrist force sensor, compute a desired velocity Ẋ = K_f⁻¹ F_measured, and send this velocity reference to the position controller. This makes the robot 'compliant' without being physically compliant."
          ],
          formula: "M_d \\ddot{x}_e + B_d \\dot{x}_e + K_d x_e = F_{\\text{ext}}, \\quad x_e = x - x_d",
          insights: [
            "Impedance control: regulate F vs X relationship — not just position, not just force",
            "M_d, B_d, K_d are virtual mass, damping, stiffness — tunable targets",
            "Admittance control: measure force → compute velocity → send to position controller",
            "Hybrid control: motion in free directions, force in constrained directions",
            "Safety: high virtual damping B_d prevents large velocities on contact"
          ]
        }
      }
    ]
  },

  {
    id: "chapter12",
    number: 12,
    title: "Grasping & Manipulation",
    topics: [
      {
        id: "contact-mechanics",
        title: "Contact Mechanics",
        description: "Friction, contact models, and grasp wrench cones.",
        hasScene: false,
        theory: {
          subtitle: "The physics of contact between robot fingers and objects",
          overview: [
            "A contact between a fingertip and an object transmits forces and moments according to the contact model. A point contact with friction (PCF) can exert forces inside a friction cone: |f_t| ≤ μ f_n (Coulomb friction), where f_n ≥ 0 is the normal force and f_t is the tangential force. The friction cone is a 3D cone in force space.",
            "Contact types: frictionless (only normal forces, 1 DOF), point contact with friction (PCF, 3 DOF, unconstrained moments), soft finger (4 DOF, can transmit torsional moment). Each type transmits different wrench components and constrains different object motions.",
            "The linearized friction cone (polyhedral approximation) replaces the circular cone with a pyramid, enabling linear programming to check grasp stability. This linearization allows efficient convex optimization over contact forces."
          ],
          formula: "f_n \\geq 0, \\quad \\|f_t\\| \\leq \\mu f_n \\quad (\\text{Coulomb friction cone})",
          insights: [
            "Normal force must be compressive (f_n ≥ 0) — fingers can push but not pull",
            "Friction coefficient μ: 0 (ice on ice) to >1 (rubber on wood)",
            "Friction cone angle: α = arctan(μ) — wider cone = more friction",
            "Soft finger contact: transmits torsional moment (τ_n ≤ μ_t f_n)",
            "Linearized friction cone: replace cone with pyramid → use LP for force analysis"
          ]
        }
      },
      {
        id: "grasp-matrix",
        title: "Grasp Matrix",
        description: "Mapping contact forces to object wrench.",
        hasScene: false,
        theory: {
          subtitle: "The linear map from finger forces to net object wrench",
          overview: [
            "The grasp matrix G maps a vector of contact forces to the net wrench applied to the object: w_obj = G f_c. Each column of G corresponds to one contact force component and encodes how that force contributes to forces and torques on the object (via lever arms).",
            "For k contacts each providing m force/moment components, G is 6×(km). The grasp is force-closure if and only if G has full row rank (rank 6) and for every external wrench w, there exists a contact force f_c = G†w + null(G)z with all forces inside their friction cones.",
            "The pseudo-inverse G† gives the minimum-norm contact forces for a given external wrench. The null space of G represents internal forces — forces that balance each other and don't affect the object but do affect finger loading. Internal forces can be used to tighten or loosen the grasp."
          ],
          formula: "w_{\\text{obj}} = G f_c, \\quad G \\in \\mathbb{R}^{6 \\times km}",
          insights: [
            "G depends only on contact geometry — not on the forces themselves",
            "Full rank G is necessary for wrench closure (any force/torque can be applied)",
            "Internal forces (null space of G): balance within the hand, don't move the object",
            "G† f_ext gives minimum-norm finger forces to support external wrench f_ext",
            "Positive internal forces keep fingers in contact; negative would require adhesion"
          ]
        }
      },
      {
        id: "force-closure",
        title: "Force Closure",
        description: "Grasps that can resist any external wrench.",
        hasScene: false,
        theory: {
          subtitle: "Measuring grasp quality and stability",
          overview: [
            "A grasp is force-closure if the contact forces can generate any wrench on the object (within the friction constraints). This means: (1) the grasp matrix G has full rank (6 for 3D objects), (2) every wrench can be produced by contact forces inside their friction cones. Form closure is stricter: closure without friction.",
            "The quality of a force-closure grasp is measured by how far the convex hull of grasp wrenches is from the origin in wrench space. The largest ball that fits inside the convex hull (centered at origin) has radius ε — the quality measure. High ε means the grasp is more robust to perturbations.",
            "Planning stable grasps is a key challenge in robot manipulation. Modern approaches use learned grasp quality metrics (GraspNet, ContactGraspNet) trained on large datasets, or analytical convex-hull computation. The classic 2-finger opposing grasp achieves force closure easily for convex objects."
          ],
          formula: "\\text{Quality} = \\max \\{ r : B(0, r) \\subseteq \\text{conv}(\\mathcal{W}_c) \\}",
          insights: [
            "Force closure: all 6-DOF wrenches can be resisted — the 'gold standard' for grasps",
            "Form closure: achievable without friction — stricter but more reliable",
            "Quality ε: largest wrench ball inside convex hull of achievable wrenches",
            "Antipodal grasps (opposing contacts on convex objects) achieve force closure easily",
            "Soft grasps (compliant fingers) are more robust than rigid grasps to pose error"
          ]
        }
      }
    ]
  },

  {
    id: "chapter13",
    number: 13,
    title: "Wheeled Mobile Robots",
    topics: [
      {
        id: "wheel-kinematics",
        title: "Wheel Kinematics",
        description: "Rolling constraints and the kinematic equations of wheeled robots.",
        hasScene: false,
        theory: {
          subtitle: "Rolling without slipping: the fundamental constraint",
          overview: [
            "Wheeled mobile robots (WMRs) are subject to nonholonomic rolling constraints: the wheel cannot slip sideways. For a wheel of radius r rotating at ω_wheel, the contact point velocity is r ω_wheel in the forward direction and 0 in the lateral direction. These constraints relate wheel speeds to the robot body velocity.",
            "The kinematic model of a differential-drive robot: q̇ = [ẋ; ẏ; φ̇] = [cos φ, -sin φ, 0; sin φ, cos φ, 0; 0, 0, 1] · [v; 0; ω], where v is forward speed and ω is turning rate. Only two of three C-space velocities are independently controllable — the lateral direction is constrained.",
            "The Jacobian H(q) of the no-slip constraint A(q)q̇ = 0 links wheel velocities u to body velocity q̇: q̇ = J(q)u, where J depends on wheel placement, radius, and robot geometry. The rank of A(q) determines which body motions are instantaneously feasible."
          ],
          formula: "A(q)\\dot{q} = 0 \\quad (\\text{no-slip}), \\quad \\dot{q} = J(q)u",
          insights: [
            "Rolling constraint: lateral wheel velocity = 0 (no sideways slip)",
            "Differential drive: two independently driven wheels → 2 DOF of velocity control",
            "Instantaneous center of curvature (ICC): all wheels must have the same ICC for pure rolling",
            "Ackermann steering: car-like robots with front-wheel steering — also nonholonomic",
            "Nonholonomic systems: full C-space reachable but only indirectly (via curved paths)"
          ]
        }
      },
      {
        id: "omnidirectional",
        title: "Omnidirectional Robots",
        description: "Mecanum and omni wheels for holonomic mobile robots.",
        hasScene: false,
        theory: {
          subtitle: "Achieving full 3-DOF planar mobility",
          overview: [
            "Omnidirectional robots use special wheels (omniwheels, Mecanum wheels) that can exert forces in any direction, not just forward. Mecanum wheels have rollers at 45° to the wheel axis; by controlling four wheel speeds, the robot can simultaneously achieve any (vx, vy, ω) in the plane — all 3 DOF instantaneously controllable.",
            "The omnidirectional kinematic model maps wheel speeds u = [u₁; u₂; u₃; u₄] to body twist [vx; vy; ω] via a constant matrix H: u = H(1/r) q̇. Since H is constant (no configuration dependence), the system is holonomic — the robot behaves like a point in its 3D C-space.",
            "The downside: omni wheels have reduced load capacity (the small passive rollers bear the load at an angle), can only push (not pull), and require smooth floors. They are ideal for logistics robots in structured environments (warehouses, hospitals) requiring precise omnidirectional navigation."
          ],
          formula: "u = \\frac{1}{r} H \\begin{bmatrix} v_x \\\\ v_y \\\\ \\omega \\end{bmatrix}, \\quad H = \\text{constant (no config dependence)}",
          insights: [
            "Holonomic (full C-space velocity controllable): vx, vy, ω all independent at all times",
            "4-wheel Mecanum: overdetermined → least-squares solution for wheel speeds",
            "3-wheel omni: exactly determined → unique wheel speed for each body velocity",
            "Mecanum rollers at 45°: decompose motion into omni and normal components",
            "Used in: Amazon Kiva, hospital delivery robots, agricultural robots"
          ]
        }
      },
      {
        id: "mobile-manipulation",
        title: "Mobile Manipulation",
        description: "Combining navigation and manipulation for mobile robots.",
        hasScene: false,
        theory: {
          subtitle: "Planning and control for mobile robot arms",
          overview: [
            "A mobile manipulator combines a wheeled mobile base with an onboard robot arm. The full configuration space is q = (q_base, q_arm) with n_base + n_arm DOF. The end-effector Jacobian has contributions from both: J_total = [J_base J_arm], where J_base maps base velocities to end-effector twist.",
            "This creates a redundant system: a 3-DOF base + 6-DOF arm = 9 DOF total for a 6-DOF task. The null space of J_total (3D) can be exploited to simultaneously navigate the base (for large-scale motion, obstacle avoidance) and control the arm (for precise manipulation).",
            "Key challenges: (1) Coordination of base and arm motions to avoid singularities. (2) Real-time path planning with a moving base (online replanning). (3) Perception — using cameras/LIDAR on a moving platform to localize objects. Modern systems like Boston Dynamics Spot with arm achieve impressive real-world performance."
          ],
          formula: "\\mathcal{V}_{ee} = J_{\\text{total}}(q) \\dot{q} = [J_{\\text{base}} \\;|\\; J_{\\text{arm}}] \\begin{bmatrix} \\dot{q}_{\\text{base}} \\\\ \\dot{q}_{\\text{arm}} \\end{bmatrix}",
          insights: [
            "Mobile manipulator has n_base + n_arm DOF > 6: redundant for manipulation tasks",
            "Null space of J_total allows base motion while arm holds end-effector fixed",
            "Base provides large workspace; arm provides dexterity near the base pose",
            "Coordination strategies: arm-priority (fix arm, move base) vs. whole-body control",
            "Applications: warehouse pick-and-place, construction, household robots"
          ]
        }
      }
    ]
  }
];
