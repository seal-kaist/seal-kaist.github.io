import { projectData } from "./template/project-data";

export const projects = [
  {
    slug: "template",
    published: "October 2, 2026",
    image: "/project-template-figure.png",
    title: projectData.title,
    description: projectData.tagline,
  },
  {
    slug: "ResidualQuant-tmp",
    published: "October 3, 2026",
    image: "/projects/residualquant/teaser.png",
    title:
      "ResidualQuant: KV Cache Quantization for Looped Transformers with 2-Bit Residuals",
    description:
      "Compressing looped-Transformer KV caches with a shared INT4 anchor and 2-bit inter-loop residuals.",
  },
];
