import ActivityLog from './pages/ActivityLog';
import Analytics from './pages/Analytics';
import DamagedItems from './pages/DamagedItems';
import Dashboard from './pages/Dashboard';
import FixReceiving from './pages/FixReceiving';
import GiftCards from './pages/GiftCards';
import Inventory from './pages/Inventory';
import InventoryValue from './pages/InventoryValue';
import Invoices from './pages/Invoices';
import OrderLookup from './pages/OrderLookup';
import Products from './pages/Products';
import PurchaseOrders from './pages/PurchaseOrders';
import ReceiveItems from './pages/ReceiveItems';
import ScanReceive from './pages/ScanReceive';
import SerialNumbers from './pages/SerialNumbers';
import UserGuide from './pages/UserGuide';
import DelayedOrders from './pages/DelayedOrders';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ActivityLog": ActivityLog,
    "Analytics": Analytics,
    "DamagedItems": DamagedItems,
    "Dashboard": Dashboard,
    "FixReceiving": FixReceiving,
    "GiftCards": GiftCards,
    "Inventory": Inventory,
    "InventoryValue": InventoryValue,
    "Invoices": Invoices,
    "OrderLookup": OrderLookup,
    "Products": Products,
    "PurchaseOrders": PurchaseOrders,
    "ReceiveItems": ReceiveItems,
    "ScanReceive": ScanReceive,
    "SerialNumbers": SerialNumbers,
    "UserGuide": UserGuide,
    "DelayedOrders": DelayedOrders,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};