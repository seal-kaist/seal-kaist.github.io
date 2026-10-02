export const projectData = {
  year: "2026",
  venue: "Conference or journal",
  title: "Project Title: A Concise Statement of the Main Contribution",
  tagline:
    "A one-sentence summary of the problem, the proposed approach, and the most important result.",
  authors: [
    { name: "First Author", marker: "1,*" },
    { name: "Second Author", marker: "1,*" },
    { name: "Sehoon Kim", marker: "1" },
  ],
  affiliations: ["Scalable & Efficient AI Lab, KAIST AI"],
  authorNote: "* Equal contribution",
  links: [
    { label: "Paper", href: "#citation" },
    { label: "Project", href: "#overview" },
    { label: "Code", href: "#method" },
  ],
  highlight:
    "Lead with one strong sentence that explains what the project enables and why the result matters.",
  abstract: [
    "Use this section to introduce the problem and explain why existing approaches fall short. Keep the opening accessible to readers outside the immediate research area, then narrow to the technical challenge addressed by the work.",
    "Follow with the central idea, the evidence supporting it, and the practical takeaway. A strong project page should make the contribution clear before asking readers to study the paper in detail.",
  ],
  method: [
    {
      label: "Step 01",
      title: "Identify the bottleneck",
      description:
        "Describe the specific computational, modeling, or systems constraint that motivates the work.",
    },
    {
      label: "Step 02",
      title: "Introduce the core idea",
      description:
        "Explain the proposed mechanism in plain language and connect it directly to the bottleneck.",
    },
    {
      label: "Step 03",
      title: "Validate at scale",
      description:
        "Summarize the experiments that establish quality, efficiency, robustness, or generality.",
    },
  ],
  results: [
    { value: "X.X×", label: "faster end-to-end execution" },
    { value: "YY%", label: "lower memory or compute cost" },
    { value: "+Z.Z", label: "quality improvement" },
  ],
  explanation: [
    "This area can hold a more detailed walkthrough of the method. Start with the intuition, then describe how data moves through the system or how the algorithm changes the model's behavior.",
    "Use figures for the ideas that are hard to explain in prose, and keep implementation details in the paper or documentation. The page should tell one coherent story rather than reproduce every experiment.",
  ],
  citation: `@article{seal2026project,
  title   = {Project Title: A Concise Statement of the Main Contribution},
  author  = {Author, First and Author, Second and Kim, Sehoon},
  journal = {Conference or Journal},
  year    = {2026}
}`,
};
