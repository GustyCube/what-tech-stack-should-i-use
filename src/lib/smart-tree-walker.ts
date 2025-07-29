import { TreeNode, TreeStructure, TechStackResult } from './tree-types';

export interface SmartQuestion {
  id: string;
  text: string;
  description?: string;
  type: 'boolean' | 'multiple';
  options: string[];
  scoringFn: (stack: TechStackResult) => number; // Returns 0-1 probability
}

export interface QuestionHistory {
  questionId: string;
  answer: string;
  stacksRemaining: number;
}

/**
 * Smart question database that can split tech stacks efficiently
 */
const SMART_QUESTIONS: SmartQuestion[] = [
  {
    id: 'needs_auth',
    text: 'Does your project require authentication/login functionality?',
    description: 'Auth features often guide framework and backend selection',
    type: 'boolean',
    options: ['Yes', 'No'],
    scoringFn: (stack) => 
      stack.tags.some(tag => ['auth', 'firebase', 'nextauth', 'supabase', 'django'].includes(tag)) ? 1 : 0
  },
  {
    id: 'mobile_app',
    text: 'Is your project intended to be mobile-first or a cross-platform app?',
    description: 'Useful for distinguishing mobile vs web-first stacks',
    type: 'boolean',
    options: ['Yes', 'No'],
    scoringFn: (stack) => 
      stack.tags.some(tag => ['mobile', 'flutter', 'reactnative', 'ionic'].includes(tag)) ? 1 : 0
  },
  {
    id: 'interactive_ui',
    text: 'Will the UI require high interactivity (like a dashboard or real-time UI)?',
    description: 'Some frameworks are better for rich interactive experiences',
    type: 'boolean',
    options: ['Yes', 'No'],
    scoringFn: (stack) =>
      stack.tags.some(tag => ['react', 'svelte', 'vue', 'websocket'].includes(tag)) ? 1 : 0
  },
  {
    id: 'payment_integration',
    text: 'Will your app include payment or checkout functionality?',
    description: 'E-commerce and SaaS apps often require secure payment support',
    type: 'boolean',
    options: ['Yes', 'No'],
    scoringFn: (stack) =>
      stack.tags.some(tag => ['stripe', 'commerce', 'payment', 'saas'].includes(tag)) ? 1 : 0
  },
  {
    id: 'batteries_included',
    text: 'Do you prefer a batteries-included framework with built-in tools?',
    description: 'These frameworks include routing, auth, ORM, templating, etc.',
    type: 'boolean',
    options: ['Yes', 'No'],
    scoringFn: (stack) =>
      stack.tags.some(tag => ['django', 'rails', 'laravel', 'nextjs', 'fullstack'].includes(tag)) ? 1 : 0
  },
  {
    id: 'primary_focus',
    text: 'Is this primarily a frontend/UI project?',
    description: 'This helps us understand if you need UI frameworks or backend services',
    type: 'boolean',
    options: ['Yes', 'No'],
    scoringFn: (stack) => stack.tags.includes('frontend') ? 1 : 0
  },
  {
    id: 'javascript_ecosystem',
    text: 'Do you prefer the JavaScript/TypeScript ecosystem?',
    description: 'JavaScript has the largest ecosystem but other languages have their strengths',
    type: 'boolean', 
    options: ['Yes', 'No'],
    scoringFn: (stack) => 
      stack.tags.some(tag => ['javascript', 'typescript', 'react', 'nextjs', 'nodejs'].includes(tag)) ? 1 : 0
  },
  {
    id: 'team_size',
    text: 'Are you working solo or with a small team (< 5 people)?',
    description: 'Smaller teams benefit from simpler, more integrated solutions',
    type: 'boolean',
    options: ['Solo/Small team', 'Large team'],
    scoringFn: (stack) => {
      const simpleStacks = ['t3', 'create-react-app', 'vite', 'express', 'flask'];
      return simpleStacks.some(simple => stack.name.toLowerCase().includes(simple)) ? 1 : 0;
    }
  },
  {
    id: 'full_stack',
    text: 'Do you need both frontend AND backend functionality?',
    description: 'Full-stack frameworks can be more productive for complete applications',
    type: 'boolean',
    options: ['Yes, full-stack', 'No, just one'],
    scoringFn: (stack) => stack.tags.includes('fullstack') ? 1 : 0
  },
  {
    id: 'database_needed',
    text: 'Will your project need a database?',
    description: 'This affects whether you need database integration and ORMs',
    type: 'boolean',
    options: ['Yes', 'No'],
    scoringFn: (stack) => 
      stack.tags.some(tag => ['database', 'prisma', 'mongodb', 'sql'].includes(tag)) ? 1 : 0
  },
  {
    id: 'complexity_preference',
    text: 'Do you prefer simple, opinionated solutions?',
    description: 'Opinionated frameworks are faster to start but less customizable',
    type: 'boolean',
    options: ['Simple & opinionated', 'Flexible & customizable'],
    scoringFn: (stack) => {
      const opinionated = ['nextjs', 't3', 'rails', 'django', 'laravel'];
      return opinionated.some(op => stack.name.toLowerCase().includes(op)) ? 1 : 0;
    }
  },
  {
    id: 'deployment_target',
    text: 'Where will you primarily deploy?',
    type: 'multiple',
    options: ['Vercel/Netlify (Easy)', 'AWS/GCP (Scalable)', 'Self-hosted', 'Mobile app stores'],
    scoringFn: (stack) => {
      // This would need more complex logic based on the selected option
      return 0.5; // Placeholder
    }
  }
];

/**
 * Calculate information gain for a question given remaining stacks
 */
function calculateInformationGain(
  question: SmartQuestion, 
  remainingStacks: TechStackResult[]
): number {
  if (remainingStacks.length <= 1) return 0;
  
  const total = remainingStacks.length;
  const groups = new Map<string, TechStackResult[]>();
  
  // Group stacks by their likely answers to this question
  remainingStacks.forEach(stack => {
    const score = question.scoringFn(stack);
    let answer: string;
    
    if (question.type === 'boolean') {
      answer = score > 0.5 ? question.options[0] : question.options[1];
    } else {
      // For multiple choice, use a more sophisticated approach
      answer = question.options[0]; // Simplified for now
    }
    
    if (!groups.has(answer)) {
      groups.set(answer, []);
    }
    groups.get(answer)!.push(stack);
  });
  
  // Calculate entropy
  let entropy = 0;
  for (const [answer, stacks] of groups) {
    const probability = stacks.length / total;
    if (probability > 0) {
      entropy += probability * Math.log2(1 / probability);
    }
  }
  
  return Math.log2(total) - entropy;
}

/**
 * Select the best question to ask next based on information theory
 */
export function selectBestQuestion(
  remainingStacks: TechStackResult[],
  askedQuestions: Set<string>
): SmartQuestion | null {
  if (remainingStacks.length <= 1) return null;
  
  const candidateQuestions = SMART_QUESTIONS.filter(
    q => !askedQuestions.has(q.id)
  );
  
  if (candidateQuestions.length === 0) return null;
  
  let bestQuestion = candidateQuestions[0];
  let bestGain = calculateInformationGain(bestQuestion, remainingStacks);
  
  for (let i = 1; i < candidateQuestions.length; i++) {
    const currentGain = calculateInformationGain(candidateQuestions[i], remainingStacks);
    if (currentGain > bestGain) {
      bestGain = currentGain;
      bestQuestion = candidateQuestions[i];
    }
  }
  
  return bestQuestion;
}

/**
 * Filter stacks based on a question and answer
 */
export function filterStacksByAnswer(
  stacks: TechStackResult[],
  question: SmartQuestion,
  answer: string
): TechStackResult[] {
  return stacks.filter(stack => {
    const score = question.scoringFn(stack);
    
    if (question.type === 'boolean') {
      const expectedAnswer = score > 0.5 ? question.options[0] : question.options[1];
      return expectedAnswer === answer;
    } else {
      // For multiple choice questions, implement more sophisticated filtering
      return true; // Simplified for now
    }
  });
}

/**
 * Smart tree walker that uses information theory to select questions
 */
export class SmartTreeWalker {
  private allStacks: TechStackResult[] = [];
  private remainingStacks: TechStackResult[] = [];
  private askedQuestions = new Set<string>();
  private history: QuestionHistory[] = [];
  
  constructor(tree: TreeStructure) {
    this.allStacks = this.extractAllStacks(tree);
    this.remainingStacks = [...this.allStacks];
  }
  
  private extractAllStacks(tree: TreeStructure): TechStackResult[] {
    const stacks: TechStackResult[] = [];
    
    Object.values(tree).forEach(node => {
      if (node.result) {
        stacks.push(node.result);
      }
    });
    
    return stacks;
  }
  
  /**
   * Get the next best question to ask
   */
  getNextQuestion(): SmartQuestion | null {
    return selectBestQuestion(this.remainingStacks, this.askedQuestions);
  }
  
  /**
   * Process an answer and update the remaining stacks
   */
  processAnswer(questionId: string, answer: string): void {
    const question = SMART_QUESTIONS.find(q => q.id === questionId);
    if (!question) return;
    
    this.askedQuestions.add(questionId);
    this.remainingStacks = filterStacksByAnswer(this.remainingStacks, question, answer);
    
    this.history.push({
      questionId,
      answer,
      stacksRemaining: this.remainingStacks.length
    });
  }
  
  /**
   * Get current state
   */
  getState() {
    return {
      remainingStacks: this.remainingStacks,
      stacksCount: this.remainingStacks.length,
      questionsAsked: this.askedQuestions.size,
      history: this.history,
      isComplete: this.remainingStacks.length <= 1
    };
  }
  
  /**
   * Get the final recommendation
   */
  getFinalRecommendation(): TechStackResult | null {
    return this.remainingStacks.length === 1 ? this.remainingStacks[0] : null;
  }
  
  /**
   * Reset the walker
   */
  reset(): void {
    this.remainingStacks = [...this.allStacks];
    this.askedQuestions.clear();
    this.history = [];
  }
}

/**
 * Calculate the theoretical minimum questions needed
 */
export function calculateMinimumQuestions(stackCount: number): number {
  return Math.ceil(Math.log2(stackCount));
}
