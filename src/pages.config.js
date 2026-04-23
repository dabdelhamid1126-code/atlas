/**
 * pages.config.js - Page routing configuration
 */
import Analytics from './pages/Analytics';
import Forecast from './pages/Forecast';
import Dashboard from './pages/Dashboard';
import EmailImport from './pages/EmailImport';
import ImportOrders from './pages/ImportOrders';
import Expenses from './pages/Expenses';
import GiftCards from './pages/GiftCards';
import Goals from './pages/Goals';
import Inventory from './pages/Inventory';
import Invoices from './pages/Invoices';
import PaymentMethods from './pages/PaymentMethods';
import Products from './pages/Products';
import PurchaseOrders from './pages/PurchaseOrders';
import ReceiveItems from './pages/ReceiveItems';
import Settings from './pages/Settings';
import Transactions from './pages/Transactions';
import NewOrders from './pages/NewOrders';
import PackageReceiving from './pages/PackageReceiving';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "Forecast": Forecast,
    "Dashboard": Dashboard,
    "EmailImport": EmailImport,
    "ImportOrders": ImportOrders,
    "Expenses": Expenses,
    "GiftCards": GiftCards,
    "Goals": Goals,
    "Inventory": Inventory,
    "Invoices": Invoices,
    "PaymentMethods": PaymentMethods,
    "Products": Products,
    "PurchaseOrders": PurchaseOrders,
    "ReceiveItems": ReceiveItems,
    "Settings": Settings,
    "Transactions": Transactions,
    "NewOrders": NewOrders,
    "PackageReceiving": PackageReceiving,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};