import { useCallback, useState } from "react";
import { PageHeader, H2, M, Eq, KeyIdea, Aside, BookRef, PhysicsRef } from "../../components/prose";
import { Challenge } from "../../components/widgets/Challenge";
import { Quiz } from "../../components/widgets/Quiz";
import { CircleMap, type CircleMapInfo } from "../../components/widgets/CircleMap";

export default function MathLinearAlgebra() {
  const [info, setInfo] = useState<CircleMapInfo | null>(null);
  const onState = useCallback((s: CircleMapInfo) => setInfo(s), []);

  const roundness = info && info.sigma[1] > 1e-6 ? info.sigma[0] / info.sigma[1] : Infinity;
  const rotateMet =
    !!info &&
    Math.abs(info.det - 1) < 0.06 &&
    roundness < 1.08 &&
    Math.abs(info.m[1]) > 0.3; // actually turned, not the identity

  const collapseMet = !!info && Math.abs(info.det) < 0.03 && info.sigma[0] > 0.5;

  return (
    <div>
      <PageHeader
        chapter="Math 2"
        section="College Physics & Dynamics"
        title="Matrices: Machines for Arrows"
        lede="A matrix is not a grid of numbers to memorize — it is a machine that transforms every arrow in the plane at once. Robotics runs on these machines."
      />

      <p>
        In Module 1 you learned to read a single arrow. Now imagine a machine that takes{" "}
        <em>any</em> arrow you feed it and returns a new arrow — rotated, stretched, squashed,
        or flipped. Turn a robot's shoulder and every point of the arm sweeps to a new place:
        that is such a machine acting on position arrows. Ask "if the joints move at these
        speeds, how fast does the hand move?" — that is another one, acting on speed arrows. The
        machine is called a <strong>matrix</strong>, and this module is about reading one at a
        glance.
      </p>

      <H2>Read the columns</H2>
      <p>
        Here is the entire secret, and it is the one thing to memorize today. A 2×2 matrix
      </p>
      <Eq>{"A = \\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}"}</Eq>
      <p>
        is fully described by what it does to just two special arrows: the unit arrow pointing
        along x, <M>{"\\mathbf{e}_1 = (1,0)"}</M>, and the unit arrow along y,{" "}
        <M>{"\\mathbf{e}_2 = (0,1)"}</M>. Feed in <M>{"\\mathbf{e}_1"}</M> and out comes{" "}
        <M>{"(a, c)"}</M> — the <em>first column</em>. Feed in <M>{"\\mathbf{e}_2"}</M> and out
        comes <M>{"(b, d)"}</M> — the <em>second column</em>.{" "}
        <strong>The columns of a matrix are where the basis arrows land.</strong>
      </p>
      <p>
        Every other arrow follows for free, because an input <M>{"(x, y)"}</M> just means "
        <M>{"x"}</M> parts of <M>{"\\mathbf{e}_1"}</M> plus <M>{"y"}</M> parts of{" "}
        <M>{"\\mathbf{e}_2"}</M>," and the machine treats the parts separately:
      </p>
      <Eq>{"A\\begin{bmatrix} x \\\\ y \\end{bmatrix} = x\\underbrace{\\begin{bmatrix} a \\\\ c \\end{bmatrix}}_{\\text{column 1}} + \\; y\\underbrace{\\begin{bmatrix} b \\\\ d \\end{bmatrix}}_{\\text{column 2}}."}</Eq>
      <p>
        Read it back: matrix-times-vector is a <em>recipe</em> — take <M>{"x"}</M> scoops of
        column 1 and <M>{"y"}</M> scoops of column 2 and add. That property (parts in, parts
        out) is called <strong>linearity</strong>, and it is why these machines are so easy to
        compute with.
      </p>

      <KeyIdea>
        The columns of a matrix are where the basis arrows land. To read an unfamiliar matrix,
        don't stare at the numbers — ask "where does <M>{"(1,0)"}</M> go? where does{" "}
        <M>{"(0,1)"}</M> go?" and picture the plane following along.
      </KeyIdea>

      <p>
        <strong>Try this</strong> in the machine below: press <em>rotate 30°</em> and check that
        the circle stays a perfect circle — rotation changes directions but no lengths. Press{" "}
        <em>stretch</em> and watch the circle become an ellipse: this machine favors one
        direction. Then press <em>squash flat</em> and watch the entire two-dimensional circle
        collapse onto a one-dimensional line. Finally drag the four sliders yourself and watch
        the <span className="cx">red</span> and <span className="cy">green</span> arrows track
        the columns you are typing.
      </p>

      <CircleMap onState={onState} />

      <Challenge id="math2-rotate" met={rotateMet}>
        Build a <em>pure rotation</em> by hand: the image must stay a circle (no stretching, det
        ≈ 1) while actually turning. Hint: make the two columns perpendicular unit arrows —{" "}
        <M>{"a = d"}</M>, <M>{"c = -b"}</M>, with <M>{"a^2 + c^2 = 1"}</M>.
      </Challenge>

      <H2>The determinant: the area dial</H2>
      <p>
        Feed the machine a shape of area 1 — the unit circle encloses area <M>{"\\pi"}</M>, a
        unit square encloses 1 — and ask: what is the area of what comes out? The answer is a
        single number attached to the matrix, its <strong>determinant</strong>:
      </p>
      <Eq>{"\\det A = ad - bc."}</Eq>
      <p>
        <M>{"\\det A = 2"}</M> means every shape comes out with twice the area.{" "}
        <M>{"\\det A = 1"}</M> means areas are preserved (rotations do this).{" "}
        <M>{"\\det A < 0"}</M> means the plane got <em>flipped over</em>, like a reflection in a
        mirror. And the special case that matters most in robotics:{" "}
        <M>{"\\det A = 0"}</M> means the output has <em>no area at all</em> — the whole plane
        has been squashed onto a line (or a point). The machine has destroyed a dimension.
      </p>
      <p>
        The number of dimensions that survive the machine is called its <strong>rank</strong>:
        rank 2 means the output still fills the plane, rank 1 means it collapsed to a line,
        rank 0 means everything went to the origin. The widget's rank readout is live — watch
        it drop exactly when the determinant hits zero.
      </p>

      <Challenge id="math2-collapse" met={collapseMet}>
        Squash the plane by hand: adjust the sliders until <M>{"|\\det A| < 0.03"}</M> without
        making the whole matrix zero. Watch the ellipse close like a fan onto a single line and
        the rank readout drop to 1.
      </Challenge>

      <H2>Running the machine backwards: the inverse</H2>
      <p>
        If a machine rotates arrows 30° counterclockwise, there is an obvious "undo" machine:
        rotate 30° clockwise. The undo machine is called the <strong>inverse</strong>, written{" "}
        <M>{"A^{-1}"}</M>, and it satisfies <M>{"A^{-1}(A\\mathbf{v}) = \\mathbf{v}"}</M> for
        every arrow: through the machine and back out again, unchanged.
      </p>
      <p>
        But here is the catch, and it connects straight to the determinant. If{" "}
        <M>{"\\det A = 0"}</M>, the machine squashed the plane onto a line — <em>many</em>{" "}
        different inputs landed on the same output. An undo machine would have to send that one
        output back to many inputs at once, which no machine can do.{" "}
        <strong>
          A matrix has an inverse exactly when its determinant is nonzero.
        </strong>{" "}
        When <M>{"\\det A"}</M> is merely <em>close</em> to zero, the inverse exists but is
        violent: it must stretch the squashed direction back out enormously, so tiny errors in
        the output become huge errors in the recovered input.
      </p>
      <Aside>
        Hold on to that last sentence. In Chapter 5 a robot pose where the Jacobian matrix loses
        rank is called a <em>singularity</em> — the arm has locally lost a direction of motion,
        and near it the "undo" (inverse kinematics) demands wild joint speeds. The mathematics
        you just watched in the widget <em>is</em> that phenomenon.
      </Aside>

      <H2>Eigenvectors: the directions the machine doesn't turn</H2>
      <p>
        Feed the machine arrows in every direction and watch what comes out. Most arrows come
        out pointing somewhere new. But for many matrices there are a few special directions
        where the output points <em>the same way as the input</em> — the machine only stretched
        it. Such a direction is called an <strong>eigenvector</strong>, and the stretch factor
        is its <strong>eigenvalue</strong> <M>{"\\lambda"}</M>:
      </p>
      <Eq>{"A\\mathbf{v} = \\lambda\\mathbf{v}."}</Eq>
      <p>
        Read it back: "machine applied to <M>{"\\mathbf{v}"}</M> equals just{" "}
        <M>{"\\lambda"}</M> times <M>{"\\mathbf{v}"}</M>" — same direction, scaled by{" "}
        <M>{"\\lambda"}</M>. Eigenvectors are the machine's grain, like the grain in wood: the
        directions along which its action is simplest.
      </p>
      <p>
        <strong>Try this</strong> in the widget above: press <em>symmetric</em> and look at the
        two gold dashed lines — inputs along them come out merely stretched, by the factors
        printed on the lines, and they are perpendicular to each other. Now press{" "}
        <em>rotate 30°</em>: the gold lines vanish and the readout says "complex." A rotation
        turns <em>every</em> arrow, so no real direction survives pointing the same way — some
        machines simply have no real eigenvectors, and that is information too.
      </p>

      <KeyIdea>
        Columns say where the basis lands; the determinant is the area dial (zero = a dimension
        destroyed = no inverse); eigenvectors are the stretch-only directions. These three
        readings of a matrix cover most of the linear algebra in this entire course.
      </KeyIdea>

      <H2>Two classic traps</H2>
      <p>
        <strong>Trap 1: order matters.</strong> Machines compose: "apply <M>{"B"}</M>, then{" "}
        <M>{"A"}</M>" is the product <M>{"AB"}</M> (read right to left, like function
        composition). But <M>{"AB \\ne BA"}</M> in general — rotate-then-stretch is not
        stretch-then-rotate. Try it with the presets and a piece of paper. In Chapter 3 this
        exact fact is why the order of 3D rotations matters.
      </p>
      <p>
        <strong>Trap 2: rows vs columns.</strong> The columns are where the basis lands — not
        the rows. Transposing a matrix (swapping rows and columns) generally gives a{" "}
        <em>different</em> machine. Keep the column picture and you will never mix them up.
      </p>

      <Quiz
        challengeId="math2-quiz"
        goal="Answer all three correctly."
        questions={[
          {
            prompt: (
              <>
                The first column of a matrix <M>{"A"}</M> is <M>{"(0, 1)"}</M>. What does that
                tell you?
              </>
            ),
            options: [
              { label: "A sends (1,0) to (0,1)", correct: true },
              { label: "A sends (0,1) to (1,0)" },
              { label: "det A = 0" },
              { label: "A is a rotation" },
            ],
            explain: "Columns are landing spots: column 1 is the image of e₁ = (1,0).",
          },
          {
            prompt: <>A matrix has determinant zero. Which statement must be true?</>,
            options: [
              { label: "It has no inverse", correct: true },
              { label: "All its entries are zero" },
              { label: "It is a rotation" },
              { label: "Its eigenvalues are complex" },
            ],
            explain:
              "det = 0 means a dimension was destroyed — many inputs share one output, so no machine can undo it.",
          },
          {
            prompt: (
              <>
                An arrow <M>{"\\mathbf{v}"}</M> satisfies <M>{"A\\mathbf{v} = 3\\mathbf{v}"}</M>.
                Then <M>{"\\mathbf{v}"}</M> is…
              </>
            ),
            options: [
              { label: "an eigenvector with eigenvalue 3", correct: true },
              { label: "perpendicular to A" },
              { label: "a column of A" },
              { label: "the inverse of A" },
            ],
            explain: "Same direction out as in, stretched ×3 — the definition of an eigenvector.",
          },
        ]}
      />

      <BookRef>
        Math foundations · Module 2 — rotation matrices are these machines in 3D (Ch 3); the
        Jacobian is the joints-to-hand machine (Ch 5); its rank drops at singularities (Ch 5,
        7); the mass matrix's eigen-directions shape how a robot resists pushes (Ch 8).
      </BookRef>
      <PhysicsRef />
    </div>
  );
}
