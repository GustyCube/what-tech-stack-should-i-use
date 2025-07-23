'use client';

import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import type { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, RotateCcw, ExternalLink, TreePine, GitBranch, CheckCircle } from 'lucide-react';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import treeData from '@/lib/tree.json';
import type { TreeStructure, TreeNode, TreeOption, TechStackResult } from '@/lib/tree-types';
import { walkTree, getCurrentNode, isTerminalNode, validateTree, generatePathSummary } from '@/lib/tree-walker';

const tree = treeData as TreeStructure;

// Validate tree on component load in development
if (process.env.NODE_ENV === 'development') {
  const validation = validateTree(tree);
  if (!validation.valid) {
    console.error('Tree validation errors:', validation.errors);
  }
}

export function BinaryTreeDecider() {
  const [currentId, setCurrentId] = useState<string>('start');
  const [history, setHistory] = useState<{ nodeId: string; answer: string }[]>([]);

  const currentNode = useMemo(() => getCurrentNode(tree, currentId), [currentId]);
  const isResult = useMemo(() => currentNode ? isTerminalNode(currentNode) : false, [currentNode]);
  const pathSummary = useMemo(() => generatePathSummary(tree, history), [history]);

  const handleOptionSelect = useCallback((optionText: string) => {
    if (!currentNode || isResult) return;

    const nextId = walkTree(tree, currentId, optionText);
    if (nextId) {
      setHistory(prev => [...prev, { nodeId: currentId, answer: optionText }]);
      setCurrentId(nextId);
    }
  }, [currentNode, isResult, currentId]);

  const handleBack = useCallback(() => {
    if (history.length === 0) return;

    const newHistory = [...history];
    const lastStep = newHistory.pop();
    
    if (lastStep) {
      setCurrentId(lastStep.nodeId);
      setHistory(newHistory);
    }
  }, [history]);

  const handleRestart = useCallback(() => {
    setCurrentId('start');
    setHistory([]);
  }, []);

  // Calculate progress based on typical tree depth
  const progress = isResult ? 100 : Math.min((history.length / 5) * 100, 90);

  // Store history in localStorage for persistence
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('wtssiu-history', JSON.stringify({ currentId, history }));
    } else {
      localStorage.removeItem('wtssiu-history');
    }
  }, [currentId, history]);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('wtssiu-history');
    if (saved) {
      try {
        const { currentId: savedId, history: savedHistory } = JSON.parse(saved);
        setCurrentId(savedId);
        setHistory(savedHistory);
      } catch (e) {
        console.error('Failed to load saved history:', e);
      }
    }
  }, []);

  if (!currentNode) {
    return (
      <div className="text-center p-8">
        <p className="text-destructive">Error: Invalid tree node</p>
        <Button onClick={handleRestart} className="mt-4">
          <RotateCcw className="h-4 w-4 mr-2" /> Restart
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full space-y-6">
      {/* Breadcrumb Trail */}
      {pathSummary.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-center gap-2 mb-3 text-gray-700 dark:text-gray-300">
            <TreePine className="h-4 w-4" />
            <span className="text-sm font-medium uppercase tracking-wider">Decision Path</span>
          </div>
          <div className="space-y-2">
            {pathSummary.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                className="flex items-start gap-2 text-sm"
              >
                <GitBranch className="h-3 w-3 mt-0.5 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">{step}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center gap-4">
        {history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleBack} 
              aria-label="Go Back"
              className="border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
        <div className="flex-1 space-y-1">
          <Progress value={progress} className="h-3 bg-gray-200 dark:bg-gray-800" />
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {isResult ? 'Complete!' : `Question ${history.length + 1}`}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleRestart} 
          aria-label="Restart"
          className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {isResult && currentNode.result ? (
          <ResultView 
            key="result" 
            result={currentNode.result} 
            pathSummary={pathSummary}
          />
        ) : (
          <QuestionView 
            key={currentId} 
            node={currentNode} 
            onOptionSelect={handleOptionSelect}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface QuestionViewProps {
  node: TreeNode;
  onOptionSelect: (optionText: string) => void;
}

const QuestionView: FC<QuestionViewProps> = memo(({ node, onOptionSelect }) => {
  if (!node.question || !node.options) return null;

  const getGridCols = (optionCount: number) => {
    if (optionCount <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (optionCount === 3) return 'grid-cols-1 md:grid-cols-3';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
  };

  // Helper function to get descriptions for common node types
  const getNodeDescription = (nodeId: string) => {
    const descriptions: Record<string, string> = {
      'start': 'Choose the category that best matches what you want to build',
      'frontend_category': 'Select the type of user interface you need to create',
      'backend_category': 'Choose the server-side functionality you need',
      'application_category': 'Pick the type of complete application you want to build',
      'specialized_category': 'Select from emerging or specialized technologies',
      'web_type': 'What kind of web application matches your needs?',
      'interactive_web': 'Choose the level of interactivity you need',
      'content_web': 'What type of content will your site primarily handle?',
      'business_web': 'What business functionality do you need?',
      'realtime_web': 'What kind of real-time features do you need?',
      'fullstack_complexity': 'Help us understand your development context for better recommendations',
      'solo_fullstack': 'What programming language would be most productive for you?',
      'small_team_fullstack': 'What area does your team have the most experience with?',
      'enterprise_fullstack': 'What are your main enterprise-level concerns?',
      'custom_fullstack': 'What type of development approach appeals to you most?',
      'mobile_platform': 'Which mobile platforms do you need to target?',
      'desktop_platform': 'Which desktop operating systems do you need to support?',
      'api_type': 'What kind of API or backend service are you building?'
    };
    return descriptions[nodeId] || 'Choose the option that best fits your project needs';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4 text-gray-700 dark:text-gray-300">
          <GitBranch className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wider">Decision Node</span>
        </div>
        <h2 className="text-2xl font-bold mb-3 text-black dark:text-white">{node.question}</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm max-w-2xl mx-auto">
          {getNodeDescription(node.id)}
        </p>
        {node.metadata?.type && (
          <Badge variant="outline" className="mt-3 border-gray-300 dark:border-gray-700">
            {node.metadata.type}
          </Badge>
        )}
      </div>
      
      <div className={`grid ${getGridCols(node.options.length)} gap-4 max-w-4xl mx-auto`}>
        {node.options.map((option, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant="outline"
              className="h-auto min-h-[120px] p-4 flex flex-col items-center gap-3 text-center justify-center transition-all duration-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-lg dark:hover:bg-gray-900 dark:hover:border-gray-600 w-full group border-gray-200 dark:border-gray-800"
              onClick={() => onOptionSelect(option.text)}
            >
              {option.icon && (
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform duration-300">
                  {option.icon}
                </div>
              )}
              <span className="font-semibold text-base text-center leading-tight text-gray-900 dark:text-gray-100 break-words">
                {option.text}
              </span>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-all duration-300">
                Select this path →
              </div>
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
});

QuestionView.displayName = 'QuestionView';

interface ResultViewProps {
  result: TechStackResult;
  pathSummary: string[];
}

const ResultView: FC<ResultViewProps> = memo(({ result }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
  >
    <div className="text-center mb-8">
      <motion.div 
        className="inline-flex items-center gap-2 mb-4"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <div className="text-4xl">🎯</div>
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700">
          Perfect Match Found
        </Badge>
      </motion.div>
      <motion.h2 
        className="text-3xl font-bold tracking-tight mb-3 text-black dark:text-white"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        {result.name}
      </motion.h2>
      <motion.p 
        className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-base"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        {result.description}
      </motion.p>
    </div>
    
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Tags */}
      <motion.div 
        className="flex flex-wrap gap-2 justify-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        {result.tags.map((tag, index) => (
          <motion.div
            key={tag}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + index * 0.05, duration: 0.2 }}
          >
            <Badge 
              variant="secondary"
              className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {tag}
            </Badge>
          </motion.div>
        ))}
      </motion.div>

      <Separator className="my-6 bg-gray-200 dark:bg-gray-800" />
      
      {/* Reasons */}
      {result.reasons && result.reasons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.3 }}
        >
          <Card className="border-gray-200 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg text-gray-900 dark:text-gray-100">Why this stack?</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {result.reasons.map((reason, index) => (
                  <motion.li 
                    key={index} 
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + index * 0.1, duration: 0.3 }}
                  >
                    <CheckCircle className="h-4 w-4 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 break-words">{reason}</span>
                  </motion.li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      {/* Action Button */}
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.3 }}
      >
        <Button 
          asChild 
          size="lg" 
          className="bg-black hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <a href={result.url} target="_blank" rel="noopener noreferrer">
            Learn More <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
      </motion.div>
    </div>
  </motion.div>
));

ResultView.displayName = 'ResultView';