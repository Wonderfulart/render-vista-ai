import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Film, Sparkles, Zap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        
        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Video Generation</span>
            </div>
            
            {/* Title */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="text-foreground">Create Stunning</span>
              <br />
              <span className="bg-gradient-to-r from-primary via-pink-400 to-accent bg-clip-text text-transparent">
                Music Videos
              </span>
              <br />
              <span className="text-foreground">in Minutes</span>
            </h1>
            
            {/* Subtitle */}
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10">
              VeoStudio Pro transforms your audio into professional 2-minute music videos 
              with AI-generated scenes, cinematic camera movements, and seamless stitching.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="text-lg px-8 py-6 bg-primary hover:bg-primary/90"
                onClick={() => navigate('/signup')}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start Creating Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6"
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
            </div>
            
            {/* Trust badges */}
            <div className="flex items-center justify-center gap-8 mt-12 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span>25 free credits</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>~15 min generation</span>
              </div>
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                <span>20 scenes per video</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Three simple steps to create your professional music video
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Upload Your Audio',
              description: 'Upload your 2-minute track and a character reference image. Our AI automatically splits your audio into 20 perfectly-timed 6-second scenes.',
              icon: '🎵',
            },
            {
              step: '02',
              title: 'Customize Scenes',
              description: 'Use AI to generate script suggestions or write your own. Choose from 4 tiers of cinematic camera movements for each scene.',
              icon: '✨',
            },
            {
              step: '03',
              title: 'Generate & Download',
              description: 'Hit generate and watch as AI creates each scene. Your final video is automatically stitched with smooth cross-fades.',
              icon: '🎬',
            },
          ].map((feature) => (
            <div
              key={feature.step}
              className="relative p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors group"
            >
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-bold text-primary">
                {feature.step}
              </div>
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Film className="w-6 h-6 text-primary" />
              <span className="font-bold text-lg">VeoStudio Pro</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 VeoStudio Pro. AI-powered video generation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
