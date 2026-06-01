import React, { useState } from "react";
import { 
  useGetCredentials, getGetCredentialsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Eye, EyeOff, RotateCw } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function ApiTokensPage() {
  const { toast } = useToast();
  
  const { data: credentials, isLoading } = useGetCredentials({ query: { queryKey: getGetCredentialsQueryKey() } });
  
  const [showSecret, setShowSecret] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ variant: "success", title: "Copied to clipboard", description: "The value has been copied to your clipboard." });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Tokens</h1>
          <p className="text-muted-foreground">Credentials for integrating the SDK into your software.</p>
        </div>
      </div>

      <Card className="border-border bg-card/50 max-w-2xl">
        <CardHeader>
          <CardTitle>Application Credentials</CardTitle>
          <CardDescription>Use these credentials to initialize the Hex Auth SDK in your project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : credentials ? (
            <>
              <div className="space-y-2">
                <Label>API Endpoint</Label>
                <div className="flex gap-2">
                  <Input readOnly value={credentials.apiEndpoint} className="font-mono text-muted-foreground bg-muted/30" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(credentials.apiEndpoint, 'endpoint')}>
                    {copiedField === 'endpoint' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>App ID</Label>
                <div className="flex gap-2">
                  <Input readOnly value={credentials.appId} className="font-mono text-muted-foreground bg-muted/30" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(credentials.appId, 'appId')}>
                    {copiedField === 'appId' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>App Secret</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input 
                      readOnly 
                      type={showSecret ? "text" : "password"} 
                      value={credentials.appSecret} 
                      className="font-mono pr-10 bg-muted/30" 
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:bg-transparent hover:text-foreground"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(credentials.appSecret, 'secret')}>
                    {copiedField === 'secret' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Keep this secret safe. Do not expose it in client-side code.</p>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-muted-foreground">Failed to load credentials.</div>
          )}
        </CardContent>
        <CardFooter className="bg-muted/20 border-t border-border py-4 px-6 flex justify-between items-center">
          <p className="text-sm text-muted-foreground">Need to invalidate an old token?</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive">
                <RotateCw className="w-4 h-4 mr-2" /> Rotate Secret
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rotate App Secret?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will invalidate your current App Secret. All applications currently using the old secret will immediately lose access until updated. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => toast({ variant: "success", title: "Feature coming soon", description: "Rotation is available in the API but needs wiring here." })} className="bg-destructive hover:bg-destructive/90">Rotate Secret</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}