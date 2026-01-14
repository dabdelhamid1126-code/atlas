import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import PurchaseOrders from './pages/PurchaseOrders';
import ReceiveItems from './pages/ReceiveItems';
import FixReceiving from './pages/FixReceiving';
import SerialNumbers from './pages/SerialNumbers';
import GiftCards from './pages/GiftCards';
import CompleteExport from './pages/CompleteExport';
import Invoices from './pages/Invoices';
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
    "CompleteExport": CompleteExport,
    "Invoices": Invoices,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};