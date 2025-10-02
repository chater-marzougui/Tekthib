import { Card, CardContent } from "@/components/ui/card";

interface SystemMessageProps {
  message: string;
  timestamp: number;
}

export default function SystemMessage({ message, timestamp }: SystemMessageProps) {
  return (
    <div className="flex justify-center my-2">
      <Card className="bg-yellow-50 border-yellow-200 max-w-md">
        <CardContent className="py-2 px-4">
          <div className="text-sm text-center text-yellow-800 font-medium">
            {message}
          </div>
          <div className="text-xs text-center text-yellow-600 mt-1">
            {new Date(timestamp).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
