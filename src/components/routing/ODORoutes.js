import EditOrder from "../pages/orders/EditOrder";
import CreateOffers from "../pages/offers/CreateOffers";
import CreateDeals from "../pages/deals/CreateDeals";
import CreateOrders from "../pages/orders/CreateOrders";
import ThreadOffers from "../pages/offers/ThreadOffers";
import ThreadDeals from "../pages/deals/ThreadDeals";
import ThreadOrders from "../pages/orders/ThreadOrders";
import { OffersPage } from "../pages/OffersPage";
import { OrdersPage } from "../pages/OrdersPage";
import { DealsPage } from "../pages/DealsPage";


// 🔥 CENTRAL CONFIG
export const ODO_ROUTES = {
    orders: {
        label: "orders",
        list: OrdersPage,
        create: CreateOrders,
        edit: EditOrder,
        threadList: ThreadOrders
    },
    offers: {
        label: "offers",
        list: OffersPage,
        create: CreateOffers,
        threadList: ThreadOffers
    },
    deals: {
        label: "deals",
        list: DealsPage,
        create: CreateDeals,
        threadList: ThreadDeals
    },
};