import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Sign up · Star Detective" };

export default function Page() {
  return (
    <main className="au-page">
      <AuthForm mode="signup" />
    </main>
  );
}
