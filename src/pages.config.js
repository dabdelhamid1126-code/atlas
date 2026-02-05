/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import ActivityLog from './pages/ActivityLog';
import Analytics from './pages/Analytics';
import DamagedItems from './pages/DamagedItems';
import Dashboard from './pages/Dashboard';
import DelayedOrders from './pages/DelayedOrders';
import Exports from './pages/Exports';
import FixReceiving from './pages/FixReceiving';
import GiftCards from './pages/GiftCards';
import Inventory from './pages/Inventory';
import InventoryValue from './pages/InventoryValue';
import Invoices from './pages/Invoices';
import OrderLookup from './pages/OrderLookup';
import Products from './pages/Products';
import PurchaseOrders from './pages/PurchaseOrders';
import ReceiveItems from './pages/ReceiveItems';
import Rewards from './pages/Rewards';
import ScanReceive from './pages/ScanReceive';
import SerialNumbers from './pages/SerialNumbers';
import UserGuide from './pages/UserGuide';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ActivityLog": ActivityLog,
    "Analytics": Analytics,
    "DamagedItems": DamagedItems,
    "Dashboard": Dashboard,
    "DelayedOrders": DelayedOrders,
    "Exports": Exports,
    "FixReceiving": FixReceiving,
    "GiftCards": GiftCards,
    "Inventory": Inventory,
    "InventoryValue": InventoryValue,
    "Invoices": Invoices,
    "OrderLookup": OrderLookup,
    "Products": Products,
    "PurchaseOrders": PurchaseOrders,
    "ReceiveItems": ReceiveItems,
    "Rewards": Rewards,
    "ScanReceive": ScanReceive,
    "SerialNumbers": SerialNumbers,
    "UserGuide": UserGuide,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};