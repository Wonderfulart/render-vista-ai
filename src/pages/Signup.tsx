import { AuthLayout } from '@/components/auth/AuthLayout';
import { SignupForm } from '@/components/auth/SignupForm';

const Signup = () => {
  return (
    <AuthLayout
      title="Get Started"
      subtitle="Create your account and get $25 in free credits"
    >
      <SignupForm />
    </AuthLayout>
  );
};

export default Signup;
