"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { SearchPanel } from "@/components/search-panel";
import { DataTableView } from "@/components/data-table-view";
import { BusinessLead } from "@/app/api/places/route";
import {
  Users,
  Globe2,
  GlobeX,
  PhoneCall,
} from "lucide-react";

// Pre-seeded initial data (Local businesses in Banani, Dhaka - restaurants, cafes, clinics, salons, gyms)
const INITIAL_LEADS: BusinessLead[] = [
  {
    id: "init-1",
    name: "The White Canary Cafe",
    phone: "+880 1712-345678",
    email: "info@whitecanarycafe.com",
    address: "House 24, Road 11, Block F, Banani, Dhaka, Bangladesh",
    website: "https://whitecanarycafe.com",
    hasWebsite: true,
    category: "Restaurant & Fine Dining",
    lat: 23.7937,
    lon: 90.4043,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=The%20White%20Canary%20Cafe%2C%20House%2024%2C%20Road%2011%2C%20Block%20F%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
    googleMapsEmbedUrl: "https://maps.google.com/maps?q=The%20White%20Canary%20Cafe%2C%20House%2024%2C%20Road%2011%2C%20Block%20F%2C%20Banani%2C%20Dhaka%2C%20Bangladesh&hl=en&z=16&output=embed",
    googleMapsDirectionsUrl: "https://www.google.com/maps/dir/?api=1&destination=The%20White%20Canary%20Cafe%2C%20House%2024%2C%20Road%2011%2C%20Block%20F%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
  },
  {
    id: "init-2",
    name: "Star Kabab & Restaurant",
    phone: "+880 1912-345678",
    email: "starkabab.banani@gmail.com",
    address: "House 18, Block E, Banani, Dhaka, Bangladesh",
    website: null,
    hasWebsite: false,
    category: "Restaurant & Fine Dining",
    lat: 23.7942,
    lon: 90.4055,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Star%20Kabab%20%26%20Restaurant%2C%20House%2018%2C%20Block%20E%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
    googleMapsEmbedUrl: "https://maps.google.com/maps?q=Star%20Kabab%20%26%20Restaurant%2C%20House%2018%2C%20Block%20E%2C%20Banani%2C%20Dhaka%2C%20Bangladesh&hl=en&z=16&output=embed",
    googleMapsDirectionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Star%20Kabab%20%26%20Restaurant%2C%20House%2018%2C%20Block%20E%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
  },
  {
    id: "init-3",
    name: "Floor 6 Bistro & Grill",
    phone: "+880 1822-998877",
    email: "contact@floor6bistro.com",
    address: "Level 6, Navana Tower, Road 4, Banani, Dhaka, Bangladesh",
    website: "https://floor6bistro.com",
    hasWebsite: true,
    category: "Restaurant & Fine Dining",
    lat: 23.7915,
    lon: 90.4021,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Floor%206%20Bistro%20%26%20Grill%2C%20Level%206%2C%20Navana%20Tower%2C%20Road%204%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
    googleMapsEmbedUrl: "https://maps.google.com/maps?q=Floor%206%20Bistro%20%26%20Grill%2C%20Level%206%2C%20Navana%20Tower%2C%20Road%204%2C%20Banani%2C%20Dhaka%2C%20Bangladesh&hl=en&z=16&output=embed",
    googleMapsDirectionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Floor%206%20Bistro%20%26%20Grill%2C%20Level%206%2C%20Navana%20Tower%2C%20Road%204%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
  },
  {
    id: "init-4",
    name: "Bella Italia Ristorante",
    phone: "+880 1511-223344",
    email: "bellaitaliabanani@gmail.com",
    address: "Plot 8, Aviation Tower, Banani, Dhaka, Bangladesh",
    website: null,
    hasWebsite: false,
    category: "Restaurant & Fine Dining",
    lat: 23.7928,
    lon: 90.4068,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Bella%20Italia%20Ristorante%2C%20Plot%208%2C%20Aviation%20Tower%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
    googleMapsEmbedUrl: "https://maps.google.com/maps?q=Bella%20Italia%20Ristorante%2C%20Plot%208%2C%20Aviation%20Tower%2C%20Banani%2C%20Dhaka%2C%20Bangladesh&hl=en&z=16&output=embed",
    googleMapsDirectionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Bella%20Italia%20Ristorante%2C%20Plot%208%2C%20Aviation%20Tower%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
  },
  {
    id: "init-5",
    name: "Gloria Jean's Coffees Banani",
    phone: "+880 1714-556677",
    email: "banani.branch@gloriajeansbd.com",
    address: "Road 11, Block D, Banani, Dhaka, Bangladesh",
    website: "https://gloriajeanscoffees.com",
    hasWebsite: true,
    category: "Cafe & Coffee Shop",
    lat: 23.795,
    lon: 90.4038,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Gloria%20Jean's%20Coffees%20Banani%2C%20Road%2011%2C%20Block%20D%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
    googleMapsEmbedUrl: "https://maps.google.com/maps?q=Gloria%20Jean's%20Coffees%20Banani%2C%20Road%2011%2C%20Block%20D%2C%20Banani%2C%20Dhaka%2C%20Bangladesh&hl=en&z=16&output=embed",
    googleMapsDirectionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Gloria%20Jean's%20Coffees%20Banani%2C%20Road%2011%2C%20Block%20D%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
  },
  {
    id: "init-6",
    name: "Banani Dental Care & Implant Center",
    phone: "+880 1713-000000",
    email: "appointments.bananidental@gmail.com",
    address: "8th Floor, Plot 2, Road 11, Banani, Dhaka, Bangladesh",
    website: null,
    hasWebsite: false,
    category: "Dental Clinic & Dentists",
    lat: 23.7935,
    lon: 90.405,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Banani%20Dental%20Care%20%26%20Implant%20Center%2C%208th%20Floor%2C%20Plot%202%2C%20Road%2011%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
    googleMapsEmbedUrl: "https://maps.google.com/maps?q=Banani%20Dental%20Care%20%26%20Implant%20Center%2C%208th%20Floor%2C%20Plot%202%2C%20Road%2011%2C%20Banani%2C%20Dhaka%2C%20Bangladesh&hl=en&z=16&output=embed",
    googleMapsDirectionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Banani%20Dental%20Care%20%26%20Implant%20Center%2C%208th%20Floor%2C%20Plot%202%2C%20Road%2011%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
  },
  {
    id: "init-7",
    name: "Herbs & Roots Ayurvedic Spa",
    phone: "+880 1819-112233",
    email: "info@herbsandrootsspa.com",
    address: "House 10, Road 13A, Banani, Dhaka, Bangladesh",
    website: "https://herbsandrootsspa.com",
    hasWebsite: true,
    category: "Spa, Sauna & Wellness Center",
    lat: 23.7961,
    lon: 90.4072,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Herbs%20%26%20Roots%20Ayurvedic%20Spa%2C%20House%2010%2C%20Road%2013A%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
    googleMapsEmbedUrl: "https://maps.google.com/maps?q=Herbs%20%26%20Roots%20Ayurvedic%20Spa%2C%20House%2010%2C%20Road%2013A%2C%20Banani%2C%20Dhaka%2C%20Bangladesh&hl=en&z=16&output=embed",
    googleMapsDirectionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Herbs%20%26%20Roots%20Ayurvedic%20Spa%2C%20House%2010%2C%20Road%2013A%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
  },
  {
    id: "init-8",
    name: "FitZone Premium Gym Banani",
    phone: "+880 1789-123456",
    email: "fitzonebanani@gmail.com",
    address: "Road 19/A, Banani, Dhaka, Bangladesh",
    website: null,
    hasWebsite: false,
    category: "Gym & Fitness Club",
    lat: 23.7948,
    lon: 90.4019,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=FitZone%20Premium%20Gym%20Banani%2C%20Road%2019%2FA%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
    googleMapsEmbedUrl: "https://maps.google.com/maps?q=FitZone%20Premium%20Gym%20Banani%2C%20Road%2019%2FA%2C%20Banani%2C%20Dhaka%2C%20Bangladesh&hl=en&z=16&output=embed",
    googleMapsDirectionsUrl: "https://www.google.com/maps/dir/?api=1&destination=FitZone%20Premium%20Gym%20Banani%2C%20Road%2019%2FA%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
  },
  {
    id: "init-9",
    name: "Artisan Bakery & Pastry Shop",
    phone: "+880 1677-889900",
    email: "orders.artisanbanani@gmail.com",
    address: "Block B, Kemal Ataturk Ave, Banani, Dhaka, Bangladesh",
    website: null,
    hasWebsite: false,
    category: "Bakery & Pastry Shop",
    lat: 23.792,
    lon: 90.408,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Artisan%20Bakery%20%26%20Pastry%20Shop%2C%20Block%20B%2C%20Kemal%20Ataturk%20Ave%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
    googleMapsEmbedUrl: "https://maps.google.com/maps?q=Artisan%20Bakery%20%26%20Pastry%20Shop%2C%20Block%20B%2C%20Kemal%20Ataturk%20Ave%2C%20Banani%2C%20Dhaka%2C%20Bangladesh&hl=en&z=16&output=embed",
    googleMapsDirectionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Artisan%20Bakery%20%26%20Pastry%20Shop%2C%20Block%20B%2C%20Kemal%20Ataturk%20Ave%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
  },
  {
    id: "init-10",
    name: "Prime Care Diagnostic & Medical Clinic",
    phone: "+880 1988-776655",
    email: "contact@primecareclinic.com",
    address: "House 45, Road 27, Banani, Dhaka, Bangladesh",
    website: "https://primecareclinic.com",
    hasWebsite: true,
    category: "Doctors & Medical Clinic",
    lat: 23.7975,
    lon: 90.4061,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Prime%20Care%20Diagnostic%20%26%20Medical%20Clinic%2C%20House%2045%2C%20Road%2027%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
    googleMapsEmbedUrl: "https://maps.google.com/maps?q=Prime%20Care%20Diagnostic%20%26%20Medical%20Clinic%2C%20House%2045%2C%20Road%2027%2C%20Banani%2C%20Dhaka%2C%20Bangladesh&hl=en&z=16&output=embed",
    googleMapsDirectionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Prime%20Care%20Diagnostic%20%26%20Medical%20Clinic%2C%20House%2045%2C%20Road%2027%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
  },
  {
    id: "init-11",
    name: "Al-Madina Auto Repair & Garage",
    phone: "+880 1711-223344",
    email: "almadina.garage@gmail.com",
    address: "House 25, Road 11, Block H, Banani, Dhaka, Bangladesh",
    website: null,
    hasWebsite: false,
    category: "Auto Repair & Mechanics",
    lat: 23.7938,
    lon: 90.4035,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Al-Madina%20Auto%20Repair%20%26%20Garage%2C%20House%2025%2C%20Road%2011%2C%20Block%20H%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
    googleMapsEmbedUrl: "https://maps.google.com/maps?q=Al-Madina%20Auto%20Repair%20%26%20Garage%2C%20House%2025%2C%20Road%2011%2C%20Block%20H%2C%20Banani%2C%20Dhaka%2C%20Bangladesh&hl=en&z=16&output=embed",
    googleMapsDirectionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Al-Madina%20Auto%20Repair%20%26%20Garage%2C%20House%2025%2C%20Road%2011%2C%20Block%20H%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
  },
  {
    id: "init-12",
    name: "Urban Green Landscaping & Nursery",
    phone: "+880 1733-445566",
    email: "urbangreen.bd@gmail.com",
    address: "Road 8, Block D, Banani, Dhaka, Bangladesh",
    website: null,
    hasWebsite: false,
    category: "Landscaping & Lawn Care",
    lat: 23.791,
    lon: 90.4045,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Urban%20Green%20Landscaping%20%26%20Nursery%2C%20Road%208%2C%20Block%20D%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
    googleMapsEmbedUrl: "https://maps.google.com/maps?q=Urban%20Green%20Landscaping%20%26%20Nursery%2C%20Road%208%2C%20Block%20D%2C%20Banani%2C%20Dhaka%2C%20Bangladesh&hl=en&z=16&output=embed",
    googleMapsDirectionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Urban%20Green%20Landscaping%20%26%20Nursery%2C%20Road%208%2C%20Block%20D%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
  },
  {
    id: "init-13",
    name: "Lexington Legal Partners",
    phone: "+880 1855-667788",
    email: "counsel@lexingtonlegal.com",
    address: "Plot 14, Road 17, Banani, Dhaka, Bangladesh",
    website: "https://lexingtonlegal.com",
    hasWebsite: true,
    category: "Law Firm & Attorneys",
    lat: 23.7944,
    lon: 90.409,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Lexington%20Legal%20Partners%2C%20Plot%2014%2C%20Road%2017%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
    googleMapsEmbedUrl: "https://maps.google.com/maps?q=Lexington%20Legal%20Partners%2C%20Plot%2014%2C%20Road%2017%2C%20Banani%2C%20Dhaka%2C%20Bangladesh&hl=en&z=16&output=embed",
    googleMapsDirectionsUrl: "https://www.google.com/maps/dir/?api=1&destination=Lexington%20Legal%20Partners%2C%20Plot%2014%2C%20Road%2017%2C%20Banani%2C%20Dhaka%2C%20Bangladesh",
  },
];

export default function DashboardPage() {
  const [leads, setLeads] = useState<BusinessLead[]>(INITIAL_LEADS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [searchLocation, setSearchLocation] = useState({
    country: "Bangladesh",
    state: "Dhaka",
    city: "Dhaka",
    area: "Banani",
  });
  const [categoryLabel, setCategoryLabel] = useState<string>("Restaurant & Fine Dining");

  const handleSearchResults = (params: {
    country: string;
    countryCode: string;
    state: string;
    stateCode: string;
    city: string;
    area: string;
    category: string;
    categoryLabel: string;
    leads: BusinessLead[];
  }) => {
    setSearchLocation({
      country: params.country,
      state: params.state,
      city: params.city,
      area: params.area,
    });
    setCategoryLabel(params.categoryLabel);
    setLeads(params.leads);
  };

  // Metrics
  const totalLeads = leads.length;
  const noWebsiteLeads = leads.filter((l) => !l.hasWebsite).length;
  const hasWebsiteLeads = leads.filter((l) => l.hasWebsite).length;
  const withEmailLeads = leads.filter((l) => l.email && l.email !== "N/A").length;
  const withPhoneLeads = leads.filter((l) => l.phone && l.phone !== "N/A").length;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans" suppressHydrationWarning>
        <Navbar />
        <main className="flex-1 max-w-[1560px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center space-y-4">
          <div className="h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">
            Initializing LeadGen Pro Workspace...
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans" suppressHydrationWarning>
      {/* Top Clean Navbar */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 max-w-[1560px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 5 Cascading Searchable Dropdowns Search Engine */}
        <SearchPanel
          onSearch={handleSearchResults}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />

        {/* Quick Analytics Cards Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Leads */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Leads</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {totalLeads}
            </div>
            <div className="text-[11px] text-slate-500">
              In target geographic zone
            </div>
          </div>

          {/* Card 2: Without Website (High Priority Cold Outreach) */}
          <div className="p-4 rounded-xl border border-red-200 bg-red-50/70 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-red-700 font-semibold">
              <span>Without Website</span>
              <GlobeX className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-700 tracking-tight">
              {noWebsiteLeads}
            </div>
            <div className="text-[11px] text-red-600/80 font-medium">
              Prime cold outreach prospects
            </div>
          </div>

          {/* Card 3: Has Website */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold">
              <span>Has Website</span>
              <Globe2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-800 tracking-tight">
              {hasWebsiteLeads}
            </div>
            <div className="text-[11px] text-emerald-700/80">
              Established web presence
            </div>
          </div>

          {/* Card 4: Contactable Leads */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-xs text-blue-700 font-semibold">
              <span>Contactable</span>
              <PhoneCall className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-800 tracking-tight">
              {withPhoneLeads + withEmailLeads}
            </div>
            <div className="text-[11px] text-blue-700/80">
              {withPhoneLeads} Phones • {withEmailLeads} Emails
            </div>
          </div>
        </div>

        {/* Data Table Section */}
        <DataTableView
          leads={leads}
          searchLocation={searchLocation}
          categoryLabel={categoryLabel}
        />
      </main>

      {/* Clean Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-medium text-slate-600">
            © 2026 LeadGen Pro. Worldwide Business Directory & Lead Discovery Engine.
          </p>
          <p className="text-slate-500">
            Clean, verified B2B leads for high-conversion web development & marketing outreach.
          </p>
        </div>
      </footer>
    </div>
  );
}
