import {
  Contact,
  Inbox,
  Settings,
  Shield,
  TagIcon,
  Laptop,
  PencilOff,
  Store,
  Globe,
} from "lucide-react";
import { Link, Outlet } from "react-router-dom";

export function OtherPage() {
  const menuItems = [
    {
      title: "Market Place",
      subtitle: "Central hub to manage Inbox & Spam leads seamlessly",
      icon: <Store className="w-8 h-8 text-blue-600" />,
      bg: "bg-blue-50",
      link: "/market-place",
    },
    {
      title: "Rejected/Stopped Emails",
      subtitle: "inside it Inbox-2 and Spam-2 will be shown",
      icon: <Inbox className="w-8 h-8 text-blue-600" />,
      bg: "bg-blue-50",
      link: "/moved-emails",
    },

    {
      title: "Defaulters",
      subtitle: "All the defaulters are Listed here",
      icon: <Settings className="w-8 h-8 text-green-600" />,
      bg: "bg-green-50",
      link: "/default-report",
    },
    {
      title: "Tag Manager",
      subtitle: "Tag manager will be shown here",
      icon: <TagIcon className="w-8 h-8 text-green-600" />,
      bg: "bg-green-50",
      link: "/tag-manager",
    },

    {
      title: "IP Manager",
      subtitle: "IP's manager will be shown here",
      icon: <Globe className="w-8 h-8 text-green-600" />,
      bg: "bg-green-50",
      link: "/ip-manager",
    },



  ];

  return (
    <div className="p-6">
      <div className="flex gap-5">
        <h2 className="text-2xl font-semibold mb-6">Others</h2>

        <a
          href="https://www.guestpostcrm.com/blog/other-section-in-guestpostcrm/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            width="30"
            height="30"
            src="https://img.icons8.com/offices/30/info.png"
            alt="info"
          />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {menuItems.map((item, index) => (
          <Link
            to={item.link}
            key={index}
            className={`${item.bg} p-6 rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition block`}
          >
            <div>{item.icon}</div>

            <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
            <p className="text-gray-600 text-sm mt-1">{item.subtitle}</p>
          </Link>
        ))}
      </div>

      {/* Child pages will load here */}
      <div className="mt-10">
        <Outlet />
      </div>
    </div>
  );
}
