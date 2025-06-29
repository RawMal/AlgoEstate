# AlgoEstate - Codebase Documentation

## Overview

AlgoEstate is a tokenized real estate marketplace built on the Algorand blockchain that enables fractional ownership of real estate properties through blockchain tokenization. The platform allows users to invest in real estate by purchasing tokens representing fractional ownership of properties.

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Blockchain**: Algorand SDK with multi-wallet support
- **Database**: Supabase (PostgreSQL)
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **Charts**: Recharts

## Architecture

### Frontend Structure

```
src/
├── components/          # Reusable UI components
│   ├── admin/          # Admin-specific components
│   ├── portfolio/      # Portfolio analysis components
│   └── ui/             # General UI components
├── contexts/           # React contexts (Theme, etc.)
├── hooks/              # Custom React hooks
├── lib/                # External library configurations
├── pages/              # Route page components
├── services/           # Business logic and API services
├── types/              # TypeScript type definitions
└── App.tsx             # Main application component
```

### Key Services

#### PropertyStateManager
- **Purpose**: Real-time blockchain monitoring and property state management
- **Features**:
  - Tracks token ownership changes
  - Maintains property state cache
  - Handles transaction events
  - Provides ownership statistics

#### Core Services
- `algorandService`: Blockchain interactions and wallet management
- `propertyService`: Property CRUD operations
- `tokenOwnershipService`: Token ownership tracking
- `portfolioAnalyticsService`: Portfolio metrics and analysis
- `kycService`: KYC application management

## Key Features

### 1. Property Management
- Property listing and detailed views
- Property tokenization as Algorand Standard Assets (ASAs)
- Investment modal for purchasing tokens
- Real-time property state updates

### 2. User Features
- **Multi-Wallet Support**: Pera, Defly, Lute, Exodus, WalletConnect
- **KYC System**: 3-tier verification with investment limits
- **Portfolio Dashboard**: Investment overview and analytics
- **Transaction History**: Complete investment tracking

### 3. Admin Features
- Property upload and management
- ASA creation and tokenization
- KYC application review
- Token distribution monitoring

### 4. Portfolio Analytics
- Performance charts and metrics
- Diversification analysis
- Tax report generation
- Real-time value tracking

## Database Schema

### Core Tables
- `properties`: Property details and tokenization information
- `users`: User profiles with KYC status
- `token_ownership`: Token ownership records
- `kyc_applications`: KYC verification applications
- `kyc_documents`: Document uploads

### Security
- Row-Level Security (RLS) implemented
- Wallet-based authentication
- Admin role verification

## Wallet Integration

### Supported Wallets
1. **Pera Wallet**: Primary mobile wallet
2. **Defly Wallet**: DeFi-focused wallet
3. **Lute Wallet**: Web-based wallet
4. **Exodus Wallet**: Multi-currency wallet
5. **WalletConnect**: Universal wallet connector

### Wallet Features
- Connect/disconnect functionality
- Transaction signing
- Account switching
- Balance checking

## Development Workflow

### Getting Started
```bash
npm install
npm run dev
```

### Environment Variables
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Building for Production
```bash
npm run build
```

## Component Structure

### Page Components
- `Home`: Landing page with property listings
- `PropertyDetail`: Individual property information
- `Portfolio`: User portfolio dashboard
- `Admin`: Admin management interface
- `Profile`: User profile and KYC management

### Shared Components
- `PropertyCard`: Property display component
- `InvestmentModal`: Token purchase interface
- `KYCForm`: Know Your Customer verification
- `WalletSelector`: Wallet connection interface

## State Management

### React Query
- Server state management
- Caching and synchronization
- Background updates
- Error handling

### Local State
- React hooks for component state
- Context for global state (theme, auth)

## Blockchain Integration

### Algorand Features
- ASA (Algorand Standard Asset) creation
- Token transfers and ownership tracking
- Real-time transaction monitoring
- Wallet integration

### Transaction Flow
1. User connects wallet
2. Selects property for investment
3. Specifies investment amount
4. Signs transaction through wallet
5. PropertyStateManager updates ownership

## Security Considerations

### Frontend Security
- Input validation and sanitization
- Secure wallet connection handling
- Protected admin routes

### Backend Security
- Database RLS policies
- Wallet signature verification
- Admin role validation

## Testing

### Test Structure
- Unit tests for services
- Component testing
- Integration tests for wallet connections

### Running Tests
```bash
npm test
```

## Recent Updates

### Latest Changes
- Database schema implementation
- Property type alignment with backend
- Admin authentication via wallet
- KYC system completion
- Bug fixes for BigInt compatibility

### Known Issues
- Mock blockchain addresses (pending mainnet deployment)
- Ongoing development of advanced analytics

## Development Guidelines

### Code Style
- TypeScript for type safety
- Functional components with hooks
- Service layer for business logic
- Consistent naming conventions

### File Organization
- Feature-based component grouping
- Separate services for different domains
- Centralized type definitions
- Environment-specific configurations

## Future Roadmap

### Planned Features
- Enhanced portfolio analytics
- Mobile application
- Additional blockchain integrations
- Advanced KYC features
- Automated compliance reporting

### Technical Improvements
- Performance optimizations
- Enhanced caching strategies
- Improved error handling
- Extended test coverage

## Support and Maintenance

### Documentation Updates
- Keep this file updated with major changes
- Document new services and components
- Update architecture diagrams as needed

### Version Control
- Feature branch workflow
- Descriptive commit messages
- Regular dependency updates

---

*Last Updated: 2025-06-28*
*Version: 1.0*