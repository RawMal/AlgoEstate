import { Link } from 'react-router-dom'
import { ArrowRight, Shield, TrendingUp, Users, Building2, Coins, Globe } from 'lucide-react'

export function HomePage() {
  const features = [
    {
      icon: Building2,
      title: 'Tokenized Properties',
      description: 'Own fractions of premium real estate through blockchain tokens'
    },
    {
      icon: Shield,
      title: 'Secure & Compliant',
      description: 'Secure platform with regulatory compliance'
    },
    {
      icon: TrendingUp,
      title: 'Liquid Investment',
      description: 'Trade property tokens 24/7 with instant settlement'
    },
    {
      icon: Users,
      title: 'Community Driven',
      description: 'Join thousands of investors in the future of real estate'
    }
  ]

  const stats = [
    { label: 'Properties Tokenized', value: '150+' },
    { label: 'Total Value Locked', value: '$50M+' },
    { label: 'Active Investors', value: '5,000+' },
    { label: 'Countries Supported', value: '25+' }
  ]

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 to-accent-600/10 dark:from-primary-900/20 dark:to-accent-900/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-up">
              <h1 className="text-4xl lg:text-6xl font-display font-bold text-secondary-900 dark:text-white leading-tight">
                The Future of
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-accent-600">
                  {' '}Real Estate{' '}
                </span>
                Investment
              </h1>
              <p className="text-xl text-secondary-600 dark:text-secondary-300 mt-6 leading-relaxed">
                Invest in premium properties with as little as $100. Own fractions of real estate through secure blockchain tokens on Algorand.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Link
                  to="/properties"
                  className="inline-flex items-center justify-center px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  Explore Properties
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/auth"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white font-semibold rounded-xl border-2 border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-200"
                >
                  Get Started
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                  alt="Modern luxury property"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white dark:bg-secondary-800 p-6 rounded-xl shadow-xl border border-secondary-200 dark:border-secondary-700">
                <div className="flex items-center space-x-3">
                  <Coins className="h-8 w-8 text-accent-500" />
                  <div>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">Token Price</p>
                    <p className="text-lg font-bold text-secondary-900 dark:text-white">$250.00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50 dark:bg-secondary-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="text-3xl lg:text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
                  {stat.value}
                </div>
                <div className="text-secondary-600 dark:text-secondary-400 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-display font-bold text-secondary-900 dark:text-white mb-4">
              Why Choose AlgoEstate?
            </h2>
            <p className="text-xl text-secondary-600 dark:text-secondary-300 max-w-3xl mx-auto">
              Experience the next generation of real estate investment with blockchain technology
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-8 bg-white dark:bg-secondary-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl w-fit mb-6 group-hover:bg-primary-200 dark:group-hover:bg-primary-800/50 transition-colors">
                  <feature.icon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-secondary-600 dark:text-secondary-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-accent-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Globe className="h-16 w-16 mx-auto mb-8 opacity-80" />
          <h2 className="text-3xl lg:text-4xl font-display font-bold mb-6">
            Ready to Start Investing?
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join thousands of investors who are already building wealth through tokenized real estate
          </p>
          <Link
            to="/properties"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl hover:bg-secondary-50 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Browse Properties
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}