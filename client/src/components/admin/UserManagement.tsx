import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Icon } from "@iconify/react";

interface UserStats {
  total_games: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_cards_played: number;
  total_bluffs: number;
  successful_bluffs: number;
  bluff_success_rate: number;
  total_challenges: number;
  successful_challenges: number;
  challenge_success_rate: number;
}

interface User {
  id: string;
  username: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string | null;
  player_stats: UserStats[];
}

interface UserManagementProps {
  baseUrl: string;
  password: string;
}

export default function UserManagement({ baseUrl, password }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [editForm, setEditForm] = useState({
    username: "",
    email: "",
    display_name: "",
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${baseUrl}/api/admin/db/users?password=${encodeURIComponent(password)}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      display_name: user.display_name || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      const response = await fetch(
        `${baseUrl}/api/admin/db/users/${editingUser.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password,
            username: editForm.username,
            email: editForm.email,
            display_name: editForm.display_name,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      toast.success("User updated successfully");
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user ${username}? This will also delete all their data.`)) {
      return;
    }

    try {
      const response = await fetch(
        `${baseUrl}/api/admin/db/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      toast.success(`User ${username} deleted successfully`);
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.display_name?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Management</h2>
        <Button onClick={fetchUsers} disabled={isLoading}>
          {isLoading ? (
            "Loading..."
          ) : (
            <>
              <Icon icon="mdi:refresh" className="w-4 h-4 mr-2" /> Refresh
            </>
          )}
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Search users by username, email or display name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading users...</div>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            {searchTerm ? "No users found matching your search" : "No users in database"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => {
            const stats = user.player_stats?.[0] || null;
            return (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {user.display_name || user.username}
                        <span className="text-sm font-normal text-muted-foreground">
                          @{user.username}
                        </span>
                      </CardTitle>
                      <CardDescription>
                        {user.email} • ID: {user.id.slice(0, 16)}...
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                      >
                        <Icon icon="mdi:pencil" className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id, user.username)}
                      >
                        <Icon icon="mdi:delete" className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Joined</div>
                      <div className="font-medium">
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Last Login</div>
                      <div className="font-medium">
                        {user.last_login_at
                          ? new Date(user.last_login_at).toLocaleDateString()
                          : "Never"}
                      </div>
                    </div>
                    {stats && (
                      <>
                        <div>
                          <div className="text-muted-foreground">Games Played</div>
                          <div className="font-medium">{stats.total_games}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Win Rate</div>
                          <div className="font-medium">
                            {stats.win_rate?.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Wins / Losses</div>
                          <div className="font-medium">
                            {stats.wins} / {stats.losses}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Cards Played</div>
                          <div className="font-medium">{stats.total_cards_played}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Bluff Success</div>
                          <div className="font-medium">
                            {stats.bluff_success_rate?.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Challenge Success</div>
                          <div className="font-medium">
                            {stats.challenge_success_rate?.toFixed(1)}%
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={editForm.username}
                onChange={(e) =>
                  setEditForm({ ...editForm, username: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={editForm.display_name}
                onChange={(e) =>
                  setEditForm({ ...editForm, display_name: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
