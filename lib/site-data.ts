export type Publication = {
  year: number;
  title: string;
  authors: string;
  venue: string;
  paper: string;
  code?: string;
  project?: string;
  more?: string;
  featured?: boolean;
};

export type ResearchGlyphKind = "models" | "systems" | "reasoning";

type ResearchArea = {
  index: string;
  icon: ResearchGlyphKind;
  title: string;
  description: string;
};

export const researchAreas: ResearchArea[] = [
  {
    index: "01",
    icon: "systems",
    title: "Systems for scalable AI",
    description:
      "We build full-stack systems for scalable training, high-performance inference, and reliable deployment of foundation models across diverse computing environments.",
  },
  {
    index: "02",
    icon: "models",
    title: "Efficient foundation models",
    description:
      "We study model architectures, compression, and long-context methods that reduce the cost of training and inference without sacrificing capability.",
  },
  {
    index: "03",
    icon: "reasoning",
    title: "Reasoning and agents",
    description:
      "We investigate efficient reasoning, planning, inference-time scaling, self-improvement, and tool use for agents operating over long horizons.",
  },
];

export const researchDetails = [
  {
    ...researchAreas[0],
    question: "What systems are needed to train and serve foundation models at scale?",
    topics: [
      "High-throughput model serving",
      "Inference runtimes and compilers",
      "Memory and communication efficiency",
    ],
  },
  {
    ...researchAreas[1],
    question: "How can capable models use substantially less memory and computation?",
    topics: [
      "Quantization and sparsity",
      "Efficient attention and long context",
      "Model architecture and compression",
    ],
  },
  {
    ...researchAreas[2],
    question: "How should agents allocate computation while reasoning and acting?",
    topics: [
      "Planning and tool use",
      "Inference-time scaling",
      "Efficient long-horizon agents",
    ],
  },
];

export const publications: Publication[] = [
  {
    year: 2026,
    title: "LoopSpec: Pipelined Self-Speculative Decoding for Looped Transformers",
    authors:
      "SangLyul Cho*, Langqing Cui*, Sehoon Kim, Dongsu Han, Insu Han",
    venue: "Preprint 2026",
    paper: "https://arxiv.org/pdf/2609.17184",
    project: "https://langq1225.github.io/loopspec/",
    code: "https://github.com/kaist-flexml-lab/loopspec",
  },
  {
    year: 2025,
    title: "Multipole Attention for Efficient Long Context Reasoning",
    authors:
      "Coleman Hooper*, Sebastian Zhao*, Luca Manolache, Sehoon Kim, Michael W. Mahoney, Yakun Sophia Shao, Kurt Keutzer, Amir Gholami",
    venue: "NeurIPS 2025",
    paper: "https://arxiv.org/pdf/2506.13059",
    code: "https://github.com/SqueezeAILab/MultipoleAttention",
  },
  {
    year: 2025,
    title: "Squeezed Attention: Accelerating Long Context Length LLM Inference",
    authors:
      "Coleman Hooper*, Sehoon Kim*, Hiva Mohammadzadeh, Monishwaran Maheswaran, June Paik, Michael W. Mahoney, Kurt Keutzer, Amir Gholami",
    venue: "ACL 2025",
    paper: "https://arxiv.org/pdf/2411.09688.pdf",
    code: "https://github.com/SqueezeAILab/SqueezedAttention",
    featured: true,
  },
  {
    year: 2025,
    title: "Plan-and-Act: Improving Planning of Agents for Long-Horizon Tasks",
    authors:
      "Lutfi Eren Erdogan*, Nicholas Lee*, Sehoon Kim, Suhong Moon, Hiroki Furuta, Gopala Anumanchipalli, Kurt Keutzer, Amir Gholami",
    venue: "ICML 2025",
    paper: "https://arxiv.org/pdf/2503.09572",
    code: "https://github.com/SqueezeAILab/plan-and-act",
  },
  {
    year: 2025,
    title: "QuantSpec: Self-Speculative Decoding with Hierarchical Quantized KV Cache",
    authors:
      "Rishabh Tiwari*, Haocheng Xi*, Aditya Tomar*, Coleman Hooper, Sehoon Kim, Maxwell Horton, Mahyar Najibi, Michael W. Mahoney, Kurt Keutzer, Amir Gholami",
    venue: "ICML 2025",
    paper: "https://arxiv.org/pdf/2409.00608",
    code: "https://github.com/SqueezeAILab/QuantSpec",
  },
  {
    year: 2025,
    title: "ETS: Efficient Tree Search for Inference-Time Scaling",
    authors:
      "Coleman Hooper, Sehoon Kim, Suhong Moon, Kerem Dilmen, Monishwaran Maheswaran, Nicholas Lee, Michael W. Mahoney, Sophia Shao, Kurt Keutzer, Amir Gholami",
    venue: "Preprint, 2025",
    paper: "https://arxiv.org/pdf/2502.13575",
    code: "https://github.com/SqueezeAILab/ETS",
  },
  {
    year: 2024,
    title: "TinyAgent: Function Calling at the Edge",
    authors:
      "Lutfi Eren Erdogan*, Nicholas Lee*, Siddharth Jha*, Sehoon Kim, Ryan Tabrizi, Suhong Moon, Coleman Hooper, Gopala Anumanchipalli, Kurt Keutzer, Amir Gholami",
    venue: "EMNLP Demo Track 2024",
    paper: "https://arxiv.org/pdf/2409.00608",
    code: "https://github.com/SqueezeAILab/TinyAgent",
  },
  {
    year: 2024,
    title: "KVQuant: Towards 10 Million Context Length LLM Inference with KV Cache Quantization",
    authors:
      "Coleman Hooper, Sehoon Kim, Hiva Mohammadzadeh, Michael W. Mahoney, Yakun Sophia Shao, Kurt Keutzer, Amir Gholami",
    venue: "NeurIPS 2024",
    paper: "https://arxiv.org/pdf/2401.18079.pdf",
    code: "https://github.com/SqueezeAILab/KVQuant",
    featured: true,
  },
  {
    year: 2024,
    title: "Efficient and Scalable Estimation of Tool Representations in Vector Space",
    authors:
      "Suhong Moon*, Siddharth Jha*, Lutfi Eren Erdogan, Sehoon Kim, Woosang Lim, Kurt Keutzer, Amir Gholami",
    venue: "Preprint, 2024",
    paper: "https://arxiv.org/pdf/2409.02141",
    code: "https://github.com/SqueezeAILab/Tool2Vec",
  },
  {
    year: 2024,
    title: "Characterizing Prompt Compression Methods for Long Context Inference",
    authors:
      "Siddharth Jha, Lutfi Eren Erdogan, Sehoon Kim, Kurt Keutzer, Amir Gholami",
    venue: "ICML Workshop 2024",
    paper: "https://arxiv.org/pdf/2407.08892.pdf",
  },
  {
    year: 2024,
    title: "Learned Best-Effort LLM Serving",
    authors:
      "Siddharth Jha, Coleman Hooper, Xiaoxuan Liu, Sehoon Kim, Kurt Keutzer",
    venue: "ICML Workshop 2024",
    paper: "https://arxiv.org/pdf/2401.07886.pdf",
  },
  {
    year: 2024,
    title: "LLM2LLM: Boosting LLMs with Novel Iterative Data Enhancement",
    authors:
      "Nicholas Lee*, Thanakul Wattanawong*, Sehoon Kim, Karttikeya Mangalam, Sheng Shen, Gopala Anumanchipali, Michael W. Mahoney, Kurt Keutzer, Amir Gholami",
    venue: "ACL 2024",
    paper: "https://arxiv.org/pdf/2403.15042.pdf",
    code: "https://github.com/SqueezeAILab/LLM2LLM",
  },
  {
    year: 2024,
    title: "An LLM Compiler for Parallel Function Calling",
    authors:
      "Sehoon Kim*, Suhong Moon*, Ryan Tabrizi, Nicholas Lee, Michael W. Mahoney, Kurt Keutzer, Amir Gholami",
    venue: "ICML 2024",
    paper: "https://arxiv.org/pdf/2312.04511.pdf",
    code: "https://github.com/SqueezeAILab/LLMCompiler",
    featured: true,
  },
  {
    year: 2024,
    title: "SqueezeLLM: Dense-and-Sparse Quantization",
    authors:
      "Sehoon Kim*, Coleman Hooper*, Amir Gholami*, Zhen Dong, Xiuyu Li, Sheng Shen, Michael W. Mahoney, Kurt Keutzer",
    venue: "ICML 2024",
    paper: "https://arxiv.org/pdf/2306.07629.pdf",
    code: "https://github.com/SqueezeAILab/SqueezeLLM",
    featured: true,
  },
  {
    year: 2024,
    title: "AI and Memory Wall",
    authors:
      "Amir Gholami, Zhewei Yao, Sehoon Kim, Coleman Hooper, Michael W. Mahoney, Kurt Keutzer",
    venue: "IEEE Micro Journal Special Issue, 2024",
    paper: "https://arxiv.org/pdf/2403.14123.pdf",
    more: "https://medium.com/riselab/ai-and-memory-wall-2cb4265cb0b8",
  },
  {
    year: 2023,
    title: "SPEED: Speculative Pipelined Execution for Efficient Decoding",
    authors:
      "Coleman Hooper, Sehoon Kim, Hiva Mohammadzadeh, Hasan Genc, Kurt Keutzer, Amir Gholami, Sophia Shao",
    venue: "NeurIPS Workshop 2023",
    paper: "https://arxiv.org/pdf/2310.12072.pdf",
  },
  {
    year: 2023,
    title: "Full Stack Optimization of Transformer Inference: A Survey",
    authors:
      "Sehoon Kim*, Coleman Hooper*, Thanakul Wattanawong, Minwoo Kang, Ruohan Yan, Hasan Genc, Grace Dinh, Qijing Huang, Kurt Keutzer, Michael W. Mahoney, Yakun Sophia Shao, Amir Gholami",
    venue: "ISCA Workshop 2023",
    paper: "https://arxiv.org/pdf/2302.14017.pdf",
  },
  {
    year: 2023,
    title: "Speculative Decoding with Big Little Decoder",
    authors:
      "Sehoon Kim, Karttikeya Mangalam, Suhong Moon, Jitendra Malik, Michael W. Mahoney, Amir Gholami, Kurt Keutzer",
    venue: "NeurIPS 2023",
    paper: "https://arxiv.org/pdf/2302.07863.pdf",
    code: "https://github.com/kssteven418/BigLittleDecoder",
  },
  {
    year: 2022,
    title: "Squeezeformer: An Efficient Transformer for Automatic Speech Recognition",
    authors:
      "Sehoon Kim*, Amir Gholami*, Albert Shaw†, Nicholas Lee†, Karttikeya Mangalam, Jitendra Malik, Michael W. Mahoney, Kurt Keutzer",
    venue: "NeurIPS 2022",
    paper: "https://arxiv.org/pdf/2206.00888.pdf",
    code: "https://github.com/kssteven418/Squeezeformer",
  },
  {
    year: 2022,
    title: "A Fast Post-Training Pruning Framework for Transformers",
    authors:
      "Woosuk Kwon*, Sehoon Kim*, Michael W. Mahoney, Joseph Hassoun, Kurt Keutzer, Amir Gholami",
    venue: "NeurIPS 2022",
    paper: "https://arxiv.org/pdf/2204.09656.pdf",
    code: "https://github.com/WoosukKwon/retraining-free-pruning",
  },
  {
    year: 2022,
    title: "Learned Token Pruning for Transformers",
    authors:
      "Sehoon Kim*, Sheng Shen*, David Thorsley*, Amir Gholami*, Woosuk Kwon, Joseph Hassoun, Kurt Keutzer",
    venue: "KDD 2022",
    paper: "https://arxiv.org/pdf/2107.00910.pdf",
    code: "https://github.com/kssteven418/LTP",
  },
  {
    year: 2022,
    title: "Integer-only Zero-shot Quantization for Efficient Speech Recognition",
    authors:
      "Sehoon Kim, Amir Gholami, Zhewei Yao, Nicholas Lee, Patrick Wang, Anirudda Nrusimha, Bohan Zhai, Tianren Gao, Michael W. Mahoney, Kurt Keutzer",
    venue: "ICASSP 2022",
    paper: "https://arxiv.org/pdf/2103.16827.pdf",
    code: "https://github.com/kssteven418/Q-ASR",
  },
  {
    year: 2022,
    title: "Hessian-Aware Pruning and Optimal Neural Implant",
    authors:
      "Shixing Yu*, Zhewei Yao*, Amir Gholami*, Zhen Dong*, Sehoon Kim, Michael W. Mahoney, Kurt Keutzer",
    venue: "WACV 2022",
    paper:
      "https://openaccess.thecvf.com/content/WACV2022/papers/Yu_Hessian-Aware_Pruning_and_Optimal_Neural_Implant_WACV_2022_paper.pdf",
    code: "https://github.com/yaozhewei/HAP",
  },
  {
    year: 2021,
    title: "A Survey of Quantization Methods for Efficient Neural Network Inference",
    authors:
      "Amir Gholami*, Sehoon Kim*, Zhen Dong*, Zhewei Yao*, Michael W. Mahoney, Kurt Keutzer",
    venue: "Low-Power Computer Vision book chapter, 2021",
    paper: "https://arxiv.org/pdf/2103.13630.pdf",
  },
  {
    year: 2021,
    title: "WindTunnel: Towards Differentiable ML Pipelines Beyond a Single Model",
    authors:
      "Gyeong-In Yu, Saeed Amizadeh, Sehoon Kim, Artidoro Pagnoni, Ce Zhang, Byung-Gon Chun, Markus Weimer, Matteo Interlandi",
    venue: "VLDB 2021",
    paper: "https://www.vldb.org/pvldb/vol15/p11-yu.pdf",
  },
  {
    year: 2021,
    title: "Terra: Imperative-Symbolic Co-Execution of Imperative Deep Learning Programs",
    authors:
      "Taebum Kim, Eunji Jeong, Geon-Woo Kim, Yunmo Koo, Sehoon Kim, Gyeong-In Yu, Byung-Gon Chun",
    venue: "NeurIPS 2021",
    paper:
      "https://proceedings.neurips.cc/paper/2021/file/0b32f1a9efe5edf3dd2f38b0c0052bfe-Paper.pdf",
  },
  {
    year: 2021,
    title: "I-BERT: Integer-only BERT Quantization",
    authors:
      "Sehoon Kim*, Amir Gholami*, Zhewei Yao*, Michael W. Mahoney, Kurt Keutzer",
    venue: "ICML 2021 Oral",
    paper: "http://proceedings.mlr.press/v139/kim21d/kim21d.pdf",
    code: "https://github.com/kssteven418/I-BERT",
  },
  {
    year: 2021,
    title: "Memory-Efficient Hardware Performance Counters with Approximate-Counting Algorithms",
    authors: "Jingyi Xu, Sehoon Kim, Borivoje Nikolic, Yakun Sophia Shao",
    venue: "ISPASS 2021",
    paper: "https://sehoonkim.org/publications/xu2021-ispass.pdf",
  },
];

export const news = [
  {
    date: "Aug 2026",
    text: "SEAL opens at the Kim Jaechul Graduate School of AI, KAIST.",
  },
  {
    date: "Aug 2026",
    text: "We are recruiting graduate students and research interns interested in efficient and scalable AI.",
    href: "/join",
  },
];
