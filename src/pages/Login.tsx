import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';

const Login = () => {
  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to continue creating amazing videos"
    >
      <LoginForm />
    </AuthLayout>
  );
};

export default Login;
