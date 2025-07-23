import { BinaryTreeDecider } from '@/components/binary-tree-decider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-black dark:via-gray-950 dark:to-gray-900 p-4">
      <div className="w-full max-w-4xl">
        <Card className="shadow-2xl rounded-2xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center gap-6 p-8 border-b border-gray-200 dark:border-gray-800">
            <div className="text-5xl filter grayscale">
              🌲
            </div>
            <div className="flex-1">
              <CardTitle className="text-3xl font-bold text-black dark:text-white mb-2">
                What Tech Stack Should I Use
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">(WTSSIU)</p>
              <p className="text-gray-500 dark:text-gray-500 mt-2">Navigate through smart decision paths to find your perfect tech stack</p>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <BinaryTreeDecider />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
