import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserManagement from "./UserManagement";
import GameManagement from "./GameManagement";
import DataVisualization from "./DataVisualization";

interface DatabaseManagementProps {
  baseUrl: string;
  password: string;
}

export default function DatabaseManagement({
  baseUrl,
  password,
}: DatabaseManagementProps) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="games">Games</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <DataVisualization baseUrl={baseUrl} password={password} />
        </TabsContent>

        <TabsContent value="users">
          <UserManagement baseUrl={baseUrl} password={password} />
        </TabsContent>

        <TabsContent value="games">
          <GameManagement baseUrl={baseUrl} password={password} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
