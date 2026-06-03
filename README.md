# Personal Budget Tracker

A professional, feature-rich personal budget tracking application built with React and TypeScript. **Customized for South African users with ZAR currency and local context.**

## 🇿🇦 South African Customization

This app is fully localized for South African users:
- **Currency**: South African Rand (ZAR) throughout the app
- **Date Format**: DD/MM/YYYY (South African standard)
- **Pre-configured Categories**: South African-specific expense and income categories
- **Public Holidays**: Recognizes SA holidays for 2024-2025
- **Tax Information**: Includes SA VAT (15%) and income tax brackets
- **Locale**: en-ZA (South African English)

For detailed South African features, see [SOUTH_AFRICAN_CUSTOMIZATION.md](SOUTH_AFRICAN_CUSTOMIZATION.md)

## Features

- **Dashboard Overview**: Visual charts showing income, expenses, and financial trends in ZAR
- **Transaction Management**: Add, edit, and delete income and expense transactions
- **Category Management**: Create and customize income/expense categories with color coding
- **Visual Analytics**: Interactive charts for expense breakdowns and daily trends
- **Dark/Light Theme**: Professional theme toggle for comfortable viewing
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Local Storage**: Data persists between sessions automatically
- **South African Context**: Pre-loaded with SA categories, holidays, and tax information

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Routing**: React Router DOM
- **Styling**: Professional CSS with CSS custom properties for theming
- **Charts**: Recharts for data visualization
- **State Management**: React Context API
- **Data Persistence**: LocalStorage

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Budget_final
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── Navbar.tsx     # Navigation component
├── context/           # React context providers
│   ├── ThemeContext.tsx   # Theme management (dark/light mode)
│   └── BudgetContext.tsx # Budget data management
├── pages/             # Main application pages
│   ├── Dashboard.tsx  # Main dashboard with charts and overview
│   ├── Transactions.tsx # Transaction management
│   └── Categories.tsx # Category management
├── styles/            # CSS files
│   ├── App.css        # Main application styles
│   ├── Dashboard.css  # Dashboard-specific styles
│   ├── Transactions.css # Transaction page styles
│   ├── Categories.css # Categories page styles
│   └── Navbar.css     # Navigation styles
├── utils/             # Helper functions
└── App.tsx            # Main application component
```

## Usage

### Dashboard

- View monthly income, expenses, and net balance
- Navigate between months using the arrow buttons
- See expense breakdown by category (pie chart)
- Track daily expense trends (bar chart)
- View recent transactions

### Transactions

- Add new income or expense transactions
- Edit existing transactions
- Delete transactions (with confirmation)
- Filter transactions by type and category
- View transaction history with summary statistics

### Categories

- Create custom income and expense categories
- Assign colors to categories for visual identification
- Edit existing categories (name and color)
- Delete unused categories
- View category usage statistics

### Theme Toggle

- Click the theme toggle button (🌙/☀️) in the navigation bar
- Switch between light and dark themes
- Theme preference is saved automatically

## Data Storage

All application data is stored in the browser's LocalStorage:
- Transactions are saved automatically
- Categories are saved automatically
- Theme preference is saved automatically

## Customization

### Adding New Transaction Categories

1. Go to the Categories page
2. Click "Add Category"
3. Enter category name, select type (income/expense), and choose a color
4. Click "Add Category"

### Modifying the Theme

The theme uses CSS custom properties defined in `App.css`. You can customize:
- Colors for income, expenses, and various UI elements
- Background and text colors
- Border and shadow styles

## Development

### Building for Production

```bash
npm run build
```

The build output will be in the `build/` directory.

### Running Tests

```bash
npm test
```

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Future Enhancements

- Export data to CSV/Excel
- Budget goal setting and tracking
- Recurring transactions
- Advanced reporting and analytics
- Multi-currency support
- User authentication and data synchronization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.