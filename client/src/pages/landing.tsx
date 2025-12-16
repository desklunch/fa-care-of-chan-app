import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Users, Shield, Loader2, Bug } from "lucide-react";
import Logo from "@/framework/components/logo";
import { GoogleLogin } from "@react-oauth/google";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const isDevelopment = import.meta.env.DEV;

export default function Landing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (credential: string) => {
      const res = await apiRequest("POST", "/api/auth/google", { credential });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    },
    onError: (error: any) => {
      if (error.message?.includes("domain")) {
        setLocation("/auth-error?reason=domain");
      } else {
        toast({
          title: "Sign in failed",
          description: error.message || "Please try again",
          variant: "destructive",
        });
      }
    },
  });

  const devLoginMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/auth/dev-login", { email });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Dev login failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="max-4xl mx-auto h-screen flex flex-col items-center justify-center text-center gap-12 text-primary p-6 ">

      <div className=" max-w-2xl rounded-xl shadow-xl border p-6 flex flex-col items-center gap-4">

      
        <div className="flex justify-center mb-6">
          <svg viewBox="0 0 34 24"  width="96px"  fill="none" xmlns="http://www.w3.org/2000/svg" data-v-37172856=""><path d="M5.439 7.808c.38.02.77-.006 1.14.072.605.126 1.05.508 1.315 1.11a.67.67 0 0 1 .01.49c-.191.614-1.055 1.222-1.693.933-.275-.127-.564-.218-.84-.345a.803.803 0 0 0-.645-.022c-.697.25-1.191.757-1.601 1.376-.046.07-.095.141-.12.218-.17.566-.394 1.122-.49 1.701a5.263 5.263 0 0 0 .456 3.23c.294.603.64 1.176.985 1.75.095.158.257.281.408.393.297.215.594.44.916.606.524.266 1.069.467 1.655.547.721.098 1.44.095 2.158.026.562-.054 1.085-.215 1.572-.565.634-.456 1.101-1.061 1.563-1.684.319-.427.646-.849.978-1.265.13-.163.302-.287.427-.453.65-.852 1.417-1.578 2.176-2.312.538-.52 1.097-1.01 1.731-1.391.216-.13.405-.304.613-.445.22-.149.435-.298.667-.419.567-.298 1.137-.588 1.764-.737.448-.106.872-.315 1.32-.419a57.94 57.94 0 0 1 2.804-.57c.98-.175 1.968-.307 2.951-.47.686-.113 1.267-.48 1.834-.884 1.059-.755 1.415-1.908 1.607-3.156.043-.287.119-.56.294-.789.235-.307.522-.298.738.023.191.284.313.611.332.956.038.765.035 1.528-.16 2.277a5.19 5.19 0 0 1-1.193 2.217c-.216.239-.435.477-.67.697-.456.43-1.045.586-1.593.81-1.405.573-2.868.929-4.33 1.293-.585.146-1.163.327-1.747.485-.659.18-1.34.301-1.977.545-.92.35-1.882.52-2.808.826-.386.13-.778.273-1.132.476-.326.19-.607.468-.907.709-.073.057-.132.132-.205.186-.53.393-.81.984-1.113 1.558-.219.416-.397.86-.637 1.262-.222.373-.503.709-.756 1.058-.111.152-.225.302-.325.46a2.778 2.778 0 0 1-.737.78 3.76 3.76 0 0 0-.556.476c-.457.488-1.02.786-1.585 1.101-.943.525-1.947.643-2.976.571a6.309 6.309 0 0 1-2.423-.68 13.132 13.132 0 0 1-2.565-1.695c-.303-.255-.527-.58-.705-.947a2.006 2.006 0 0 0-.322-.476 1.824 1.824 0 0 1-.416-.786c-.191-.763-.413-1.523-.537-2.3a7.132 7.132 0 0 1 .03-2.418c.089-.497.135-1.002.173-1.506.046-.62.245-1.188.432-1.77.21-.651.678-1.047 1.134-1.46.219-.201.478-.353.726-.517a4.14 4.14 0 0 1 2.44-.72c.137.003.275 0 .412 0v-.017h.003ZM34 18.474c-.078.539-.164 1.09-.233 1.646a4.585 4.585 0 0 1-1.255 2.637c-.558.56-1.201.973-1.966 1.102-.726.123-1.456.23-2.19.029a2.17 2.17 0 0 1-.952-.534c-.263-.25-.515-.514-.767-.78a2.144 2.144 0 0 1-.45-.764 4.438 4.438 0 0 0-.312-.66c-.198-.355-.273-.728-.286-1.15-.03-.88.214-1.681.563-2.445.225-.496.55-.944.85-1.394.228-.344.48-.671.74-.987.598-.732 1.351-1.03 2.257-.91.459.064.92.11 1.381.15.368.031.679.186.942.456.265.273.522.557.796.818.402.384.59.886.692 1.426.083.439.126.886.19 1.36Zm-4.033-2.238c-.453-.003-.745.155-1.01.536-.25.362-.494.726-.76 1.076-.34.454-.487.967-.503 1.544-.022.835.182 1.55.825 2.083.5.416 1.027.6 1.644.344.094-.037.19-.063.282-.106.616-.301 1.147-.703 1.426-1.4.255-.634.325-1.3.27-1.98-.112-1.377-1.224-2.031-2.171-2.095l-.003-.002Z" fill="#DAF600"></path><path d="M13.207 5.509c-.043.992.656 1.525 1.373 1.68.337.072.687.078 1.027.138.22.04.441.104.647.196.506.222.717.811.492 1.347a1.425 1.425 0 0 1-.88.831c-.575.207-1.113.179-1.656-.12-.305-.17-.644-.271-.957-.427a3.531 3.531 0 0 1-.634-.4c-.469-.37-.915-.765-1.3-1.245a2.817 2.817 0 0 1-.603-1.364c-.066-.406.009-.78.043-1.169.075-.877.447-1.605.913-2.299.26-.388.492-.8.765-1.177A4.277 4.277 0 0 1 13.584.378c.134-.086.284-.138.428-.201.038-.018.083-.018.123-.032.918-.325 1.785-.043 2.649.253.353.121.72.21 1.017.472.3.265.604.524.907.786.024.02.048.043.069.066.554.601.492.981.024 1.6-.128.167-.318.227-.514.147-.179-.075-.35-.176-.518-.274-.378-.218-.742-.469-1.13-.662-.596-.299-1.187-.175-1.725.173-.286.187-.522.47-.77.717-.116.115-.204.259-.313.38-.431.474-.594 1.061-.624 1.703v.003Z" fill="#DAF600"></path></svg>

        </div>

        <div className="rounded-md border border-primary w-fit p-2 py-1 text-xs tracking-wide font-normal">
          CoCOS 1.0.1
        </div>
        
        {/* Desktop: Show sign-in */}
        <div
          className="flex hidden md:flex-col items-center gap-2"
          data-testid="button-get-started"
        >
          <p className="text-base mb-4 ">
            Sign in with your primary Care of Chan email address.
          </p>
          {loginMutation.isPending ? (
            <Button size="lg" className="h-12 px-8" disabled>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Signing in...
            </Button>
          ) : (
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                if (credentialResponse.credential) {
                  loginMutation.mutate(credentialResponse.credential);
                }
              }}
              onError={() => {
                toast({
                  title: "Sign in failed",
                  description: "Google sign-in was cancelled or failed",
                  variant: "destructive",
                });
              }}
              theme="filled_blue"
              size="large"
              text="signin_with"
              shape="pill"
            />
          )}
        </div>

        {/* Mobile: Show not optimized message */}
        <div
          className="flex md:hidden items-center"
          data-testid="mobile-notice"
        >
          <p className="text-base text-muted-foreground">
            This app is not yet fully optimized for mobile devices. Please use a
            desktop computer.
          </p>
        </div>
        {isDevelopment && (
          <div className="mt-6 pt-6 ">
            <Button
              variant="outline"
              size="sm"
              onClick={() => devLoginMutation.mutate("omar@functionalartists.ai")}
              disabled={devLoginMutation.isPending}
              data-testid="button-dev-login"
            >
              {devLoginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <Bug className="mr-2 h-4 w-4" />
                  Dev Login (omar@functionalartists.ai)
                </>
              )}
            </Button>
          </div>
        )}
 
      </div>

    </div>
  );
}
