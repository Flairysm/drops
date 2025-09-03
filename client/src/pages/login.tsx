import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Login schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      console.log('🔐 Attempting login with:', data.email);
      const response = await apiRequest("POST", "/api/auth/login", data);
      console.log('🔐 Login response:', response);
      return response;
    },
    onSuccess: (response) => {
      console.log('🔐 Login mutation success:', response);
      toast({
        title: "Welcome back!",
        description: "You've been logged in successfully.",
      });
      
      // Force a refetch of user data and clear any cached data
      console.log('🔐 Clearing query cache and refetching user data...');
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Small delay to ensure cache is cleared before redirect
      setTimeout(() => {
        console.log('🔐 Redirecting to home page...');
        setLocation("/");
      }, 100);
    },
    onError: (error: any) => {
      console.error('❌ Login mutation error:', error);
      toast({
        title: "Login Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <Card className="w-full max-w-md bg-gray-900/80 border-blue-500/30 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-gaming text-blue-400">Welcome Back</CardTitle>
          <CardDescription className="text-gray-300">
            Sign in to continue your card collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-200">Email</Label>
              <Input
                id="email"
                type="email"
                data-testid="input-email"
                {...form.register("email")}
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                placeholder="your@email.com"
              />
              {form.formState.errors.email && (
                <p className="text-red-400 text-sm">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-200">Password</Label>
              <Input
                id="password"
                type="password"
                data-testid="input-password"
                {...form.register("password")}
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                placeholder="Enter your password"
              />
              {form.formState.errors.password && (
                <p className="text-red-400 text-sm">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              data-testid="button-login"
              disabled={loginMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              {loginMutation.isPending ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-300">
              Don't have an account?{" "}
              <Link 
                href="/register" 
                className="text-blue-400 hover:text-blue-300 underline"
                data-testid="link-register"
              >
                Create one here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}