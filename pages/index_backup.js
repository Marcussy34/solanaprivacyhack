import { Geist, Geist_Mono } from "next/font/google";
import { Spotlight } from "../components/ui/spotlight";
import { BlurFade } from "../components/ui/blur-fade";
import { Button } from "../components/ui/button";
import { Marquee } from "../components/ui/marquee";
import { Particles } from "../components/ui/particles";
import { AnimatedShinyText } from "../components/ui/animated-shiny-text";
import { TextGenerateEffect } from "../components/ui/text-generate-effect";
import { BackgroundBeams } from "../components/ui/background-beams";
import { Shield, Lock, Eye, Zap, Users, Code, ArrowRight } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const features = [
  {
    icon: Shield,
    title: "Private Transactions",
    description: "Send and receive SOL with complete privacy using zero-knowledge proofs.",
  },
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description: "Your transaction data is encrypted and only visible to you.",
  },
  {
    icon: Eye,
    title: "Stealth Addresses",
    description: "Generate one-time addresses for enhanced anonymity.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Leverage Solana's speed for instant private transactions.",
  },
  {
    icon: Users,
    title: "Decentralized",
    description: "No central authority. Your privacy is trustless and verifiable.",
  },
  {
    icon: Code,
    title: "Open Source",
    description: "Fully auditable code. Transparency in how we protect your privacy.",
  },
];

const testimonials = [
  { name: "Alex K.", text: "Finally, true privacy on Solana. This is game-changing.", avatar: "🔮" },
  { name: "Sarah M.", text: "The speed combined with privacy is unmatched. Love it!", avatar: "⚡" },
  { name: "Dev_0x", text: "ZK proofs done right. Impressive implementation.", avatar: "🛡️" },
  { name: "CryptoNinja", text: "Been waiting for this. Privacy should be the default.", avatar: "🥷" },
  { name: "Elena R.", text: "Seamless experience. My transactions are finally private.", avatar: "✨" },
  { name: "BlockBuilder", text: "The tech behind this is solid. Great work team!", avatar: "🏗️" },
];

const stats = [
  { value: "$10M+", label: "Volume Protected" },
  { value: "50K+", label: "Private Transactions" },
  { value: "99.9%", label: "Uptime" },
  { value: "<1s", label: "Transaction Time" },
];

const TestimonialCard = ({ name, text, avatar }) => (
  <div className="mx-4 w-72 rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 backdrop-blur-sm">
    <div className="flex items-center gap-3">
      <span className="text-2xl">{avatar}</span>
      <span className="font-medium text-white">{name}</span>
    </div>
    <p className="mt-3 text-sm text-zinc-400">{text}</p>
  </div>
);

export default function Home() {
  return (
    <div
      className={`${geistSans.className} ${geistMono.className} min-h-screen bg-black antialiased`}
    >
      {/* Hero Section with Spotlight & Particles */}
      <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black/[0.96] px-4">
        <Spotlight
          className="-top-40 left-0 md:-top-20 md:left-60"
          fill="#9333ea"
        />
        <Particles
          className="absolute inset-0"
          quantity={80}
          staticity={30}
          color="#a855f7"
          size={0.5}
        />
        
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <BlurFade delay={0.1}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-2">
              <AnimatedShinyText className="text-sm text-purple-300">
                ✨ Building on Solana
              </AnimatedShinyText>
            </div>
          </BlurFade>

          <BlurFade delay={0.2}>
            <h1 className="bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-7xl md:text-8xl">
              Privacy for
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 bg-clip-text">
                Solana
              </span>
            </h1>
          </BlurFade>

          <BlurFade delay={0.3}>
            <TextGenerateEffect 
              words="Experience true financial privacy on the fastest blockchain. Send, receive, and transact without leaving a trace."
              className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 sm:text-xl"
            />
          </BlurFade>

          <BlurFade delay={0.5}>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="group h-12 min-w-[180px] bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
              >
                Launch App
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 min-w-[180px] border-zinc-700 bg-transparent text-white hover:bg-zinc-800"
              >
                Documentation
              </Button>
            </div>
          </BlurFade>
        </div>

        {/* Gradient decoration */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent"></div>
      </section>

      {/* Stats Section */}
      <section className="relative border-y border-zinc-800 bg-black py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <BlurFade key={stat.label} delay={0.1 + index * 0.1} inView>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white md:text-4xl">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm text-zinc-500">{stat.label}</div>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative bg-black px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <BlurFade delay={0.1} inView>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white sm:text-4xl md:text-5xl">
                Privacy-First Features
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
                Built with cutting-edge cryptographic techniques to ensure your 
                transactions remain private and secure.
              </p>
            </div>
          </BlurFade>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <BlurFade key={feature.title} delay={0.1 + index * 0.1} inView>
                <div className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all duration-300 hover:border-purple-500/50 hover:bg-zinc-900">
                  <div className="mb-4 inline-flex rounded-xl bg-purple-500/10 p-3">
                    <feature.icon className="h-6 w-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    {feature.description}
                  </p>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials with Marquee */}
      <section className="relative overflow-hidden bg-black py-24">
        <div className="mb-12 text-center">
          <BlurFade delay={0.1} inView>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Trusted by Privacy Advocates
            </h2>
          </BlurFade>
        </div>

        <div className="relative">
          <Marquee pauseOnHover className="[--duration:30s]">
            {testimonials.map((testimonial) => (
              <TestimonialCard key={testimonial.name} {...testimonial} />
            ))}
          </Marquee>
          <Marquee pauseOnHover reverse className="mt-4 [--duration:35s]">
            {[...testimonials].reverse().map((testimonial) => (
              <TestimonialCard key={testimonial.name + "-rev"} {...testimonial} />
            ))}
          </Marquee>
          
          {/* Fade edges */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black to-transparent"></div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black to-transparent"></div>
        </div>
      </section>

      {/* CTA Section with Background Beams */}
      <section className="relative overflow-hidden bg-black px-4 py-24">
        <BackgroundBeams className="opacity-40" />
        
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <BlurFade delay={0.1} inView>
            <h2 className="text-3xl font-bold text-white sm:text-4xl md:text-5xl">
              Ready to go private?
            </h2>
          </BlurFade>
          
          <BlurFade delay={0.2} inView>
            <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">
              Join the growing community of users who value their financial privacy. 
              Start using privacy-preserving transactions on Solana today.
            </p>
          </BlurFade>

          <BlurFade delay={0.3} inView>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="group h-14 min-w-[200px] bg-white text-black hover:bg-zinc-200"
              >
                <AnimatedShinyText shimmerWidth={150} className="text-black">
                  Get Started Now
                </AnimatedShinyText>
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="h-14 min-w-[200px] text-white hover:bg-white/10"
              >
                Learn More →
              </Button>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-black px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <BlurFade delay={0.1} inView>
              <p className="text-sm text-zinc-500">
                © 2026 Solana Privacy. Built for the hackathon.
              </p>
            </BlurFade>
            <BlurFade delay={0.2} inView>
              <div className="flex gap-6">
                <a href="#" className="text-sm text-zinc-500 transition-colors hover:text-white">
                  GitHub
                </a>
                <a href="#" className="text-sm text-zinc-500 transition-colors hover:text-white">
                  Twitter
                </a>
                <a href="#" className="text-sm text-zinc-500 transition-colors hover:text-white">
                  Discord
                </a>
              </div>
            </BlurFade>
          </div>
        </div>
      </footer>
    </div>
  );
}
