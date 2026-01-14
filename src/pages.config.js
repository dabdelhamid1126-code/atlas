import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import PurchaseOrders from './pages/PurchaseOrders';
import ReceiveItems from './pages/ReceiveItems';
import FixReceiving from './pages/FixReceiving';
import SerialNumbers from './pages/SerialNumbers';
import GiftCards from './pages/GiftCards';
import Invoices from './pages/Invoices';
import ActivityLog from './pages/ActivityLog';
import Analytics from './pages/Analytics';
import DamagedItems from './pages/DamagedItems';
import OrderLookup from './pages/OrderLookup';
import UserGuide from './pages/UserGuide';
import ScanReceive from './pages/ScanReceive';
import InventoryValue from './pages/InventoryValue';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Products": Products,
    "Inventory": Inventory,
    "PurchaseOrders": PurchaseOrders,
    "ReceiveItems": ReceiveItems,
    "FixReceiving": FixReceiving,
    "SerialNumbers": SerialNumbers,
    "GiftCards": GiftCards,
    "Invoices": Invoices,
    "ActivityLog": ActivityLog,
    "Analytics": Analytics,
    "DamagedItems": DamagedItems,
    "OrderLookup": OrderLookup,
    "UserGuide": UserGuide,
    "ScanReceive": ScanReceive,
    "InventoryValue": InventoryValue,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};