import { useEffect, useMemo, useState } from "react";

import jsPDF from "jspdf";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
} from "chart.js";

import { Bar, Doughnut, Line } from "react-chartjs-2";

import "./App.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

const API_BASE = "http://localhost:5000";

function App() {
  // ===============================
  // STATES
  // ===============================

  const [dashboard, setDashboard] = useState(null);
  const [salesData, setSalesData] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedMonth, setSelectedMonth] = useState("All");

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(true);

  const [showCategoryChart, setShowCategoryChart] = useState(true);
  const [showRegionChart, setShowRegionChart] = useState(true);
  const [showMonthlyChart, setShowMonthlyChart] = useState(true);
  const [showSalesTable, setShowSalesTable] = useState(true);

  const recordsPerPage = 5;

  // ===============================
  // LOAD DATA
  // ===============================

  const loadData = async () => {
    try {
      setLoading(true);

      const [dashboardResponse, salesResponse] =
        await Promise.all([
          fetch(`${API_BASE}/api/dashboard`),
          fetch(`${API_BASE}/api/sales`)
        ]);

      if (!dashboardResponse.ok || !salesResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const dashboardData = await dashboardResponse.json();
      const sales = await salesResponse.json();

      setDashboard(dashboardData);
      setSalesData(sales);
    } catch (error) {
      console.error("Loading Error:", error);
      alert("Unable to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ===============================
  // MONTH OPTIONS
  // ===============================

  const monthOptions = useMemo(() => {
    const months = [
      ...new Set(
        salesData
          .map((item) => String(item.sale_date).slice(0, 7))
          .filter(Boolean)
      )
    ];

    return months.sort();
  }, [salesData]);

  const formatMonth = (value) => {
    const [year, month] = value.split("-");

    const date = new Date(
      Number(year),
      Number(month) - 1,
      1
    );

    return date.toLocaleString("en-IN", {
      month: "long",
      year: "numeric"
    });
  };

  // ===============================
  // FILTER SALES
  // ===============================

  const filteredSales = useMemo(() => {
    return salesData.filter((item) => {
      const categoryMatch =
        selectedCategory === "All" ||
        item.category === selectedCategory;

      const monthMatch =
        selectedMonth === "All" ||
        String(item.sale_date).slice(0, 7) === selectedMonth;

      const searchValue = searchTerm.toLowerCase();

      const searchMatch =
        String(item.product_name || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(item.category || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(item.region || "")
          .toLowerCase()
          .includes(searchValue);

      return categoryMatch && monthMatch && searchMatch;
    });
  }, [
    salesData,
    selectedCategory,
    selectedMonth,
    searchTerm
  ]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedMonth, searchTerm]);

  // ===============================
  // KPI CALCULATIONS
  // ===============================

  const filteredTotalSales = useMemo(() => {
    return filteredSales.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
  }, [filteredSales]);

  const filteredTotalOrders = filteredSales.length;

  const filteredTotalQuantity = useMemo(() => {
    return filteredSales.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );
  }, [filteredSales]);

  const filteredAverageSale =
    filteredTotalOrders > 0
      ? filteredTotalSales / filteredTotalOrders
      : 0;

  // ===============================
  // CATEGORY TOTALS
  // ===============================

  const categoryTotals = useMemo(() => {
    const totals = {};

    filteredSales.forEach((item) => {
      const category = item.category || "Unknown";

      totals[category] =
        (totals[category] || 0) + Number(item.amount || 0);
    });

    return totals;
  }, [filteredSales]);

  // ===============================
  // REGION TOTALS
  // ===============================

  const regionTotals = useMemo(() => {
    const totals = {};

    filteredSales.forEach((item) => {
      const region = item.region || "Unknown";

      totals[region] =
        (totals[region] || 0) + Number(item.amount || 0);
    });

    return totals;
  }, [filteredSales]);

  // ===============================
  // MONTHLY TOTALS
  // ===============================

  const monthlyTotals = useMemo(() => {
    const totals = {};

    filteredSales.forEach((item) => {
      const month = String(item.sale_date).slice(0, 7);

      totals[month] =
        (totals[month] || 0) + Number(item.amount || 0);
    });

    return totals;
  }, [filteredSales]);

  // ===============================
// TOP SELLING PRODUCTS
// ===============================

const topProducts = useMemo(() => {
  const totals = {};

  filteredSales.forEach((item) => {
    const product = item.product_name || "Unknown";

    totals[product] =
      (totals[product] || 0) + Number(item.amount || 0);
  });

  return Object.entries(totals)
    .map(([product, total]) => ({
      product,
      total
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}, [filteredSales]);

  // ===============================
  // CHART DATA
  // ===============================

  const categoryChartData = {
    labels: Object.keys(categoryTotals),
    datasets: [
      {
        label: "Sales",
        data: Object.values(categoryTotals),
        backgroundColor: [
          "#2563eb",
          "#7c3aed",
          "#06b6d4",
          "#10b981",
          "#f59e0b"
        ],
        borderRadius: 8
      }
    ]
  };

  const regionChartData = {
    labels: Object.keys(regionTotals),
    datasets: [
      {
        label: "Sales",
        data: Object.values(regionTotals),
        backgroundColor: [
          "#2563eb",
          "#7c3aed",
          "#06b6d4",
          "#10b981",
          "#f59e0b",
          "#ef4444"
        ],
        borderWidth: 0
      }
    ]
  };

  const monthlyKeys = Object.keys(monthlyTotals).sort();

  const monthlyChartData = {
    labels: monthlyKeys.map(formatMonth),
    datasets: [
      {
        label: "Monthly Sales",
        data: monthlyKeys.map(
          (month) => monthlyTotals[month]
        ),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.12)",
        pointBackgroundColor: "#2563eb",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 5,
        fill: true,
        tension: 0.35
      }
    ]
  };

  // ===============================
  // BAR CHART OPTIONS
  // ===============================

  const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,

  interaction: {
    mode: "nearest",
    intersect: true
  },

  plugins: {
    legend: {
      display: false
    },

    tooltip: {
      backgroundColor: "#0f172a",
      titleColor: "#ffffff",
      bodyColor: "#e2e8f0",
      padding: 12,
      cornerRadius: 8,

      callbacks: {
        label: function (context) {
          const value = Number(context.raw || 0);

          return ` Sales: ₹${value.toLocaleString("en-IN")}`;
        }
      }
    }
  },

  scales: {
    x: {
      grid: {
        display: false
      }
    },

    y: {
      beginAtZero: true,

      grid: {
        color: "rgba(148, 163, 184, 0.15)"
      },

      ticks: {
        callback: function (value) {
          return "₹" + Number(value).toLocaleString("en-IN");
        }
      }
    }
  }
};

  // ===============================
  // DOUGHNUT CHART OPTIONS
  // ===============================

  const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,

  animation: {
    animateRotate: true,
    animateScale: true,
    duration: 700
  },

  plugins: {
    legend: {
      position: "bottom",

      labels: {
        padding: 18,
        usePointStyle: true
      }
    },

    tooltip: {
      backgroundColor: "#0f172a",
      titleColor: "#ffffff",
      bodyColor: "#e2e8f0",
      padding: 12,
      cornerRadius: 8,

      callbacks: {
        label: function (context) {
          const value = Number(context.raw || 0);

          const total = context.dataset.data.reduce(
            (sum, item) => sum + Number(item || 0),
            0
          );

          const percentage =
            total > 0
              ? ((value / total) * 100).toFixed(1)
              : 0;

          return ` ₹${value.toLocaleString("en-IN")} (${percentage}%)`;
        }
      }
    }
  }
};
  // ===============================
  // MONTHLY LINE CHART OPTIONS
  // ===============================

  const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,

  interaction: {
    mode: "nearest",
    intersect: true
  },

  animation: {
    duration: 700,
    easing: "easeOutQuart"
  },

  plugins: {
    legend: {
      display: false
    },

    tooltip: {
      backgroundColor: "#0f172a",
      titleColor: "#ffffff",
      bodyColor: "#e2e8f0",
      padding: 12,
      cornerRadius: 8,

      callbacks: {
        label: function (context) {
          const value = Number(context.raw || 0);

          return ` Sales: ₹${value.toLocaleString("en-IN")}`;
        }
      }
    }
  },

  scales: {
    x: {
      grid: {
        display: false
      }
    },

    y: {
      beginAtZero: true,

      grid: {
        color: "rgba(148, 163, 184, 0.15)"
      },

      ticks: {
        callback: function (value) {
          return "₹" + Number(value).toLocaleString("en-IN");
        }
      }
    }
  }
};
  // ===============================
  // PAGINATION
  // ===============================

  const totalPages = Math.ceil(
    filteredSales.length / recordsPerPage
  );

  const startIndex =
    (currentPage - 1) * recordsPerPage;

  const currentRecords = filteredSales.slice(
    startIndex,
    startIndex + recordsPerPage
  );

  // ===============================
  // CSV UPLOAD
  // ===============================

  const handleCSVUpload = async (event) => {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Please select a CSV file.");
      return;
    }

    const formData = new FormData();

    formData.append("file", file);

    try {
      const response = await fetch(
        `${API_BASE}/api/upload-csv`,
        {
          method: "POST",
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "CSV upload failed"
        );
      }

      alert(data.message || "CSV upload successful");

      await loadData();

      event.target.value = "";
    } catch (error) {
      console.error("Upload Error:", error);

      alert(error.message || "CSV upload failed");
    }
  };

  // ===============================
  // CSV EXPORT
  // ===============================

  const escapeCSV = (value) => {
    const text = String(value ?? "");

    if (
      text.includes(",") ||
      text.includes('"') ||
      text.includes("\n")
    ) {
      return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
  };

  const handleCSVExport = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/sales`
      );

      if (!response.ok) {
        throw new Error("Unable to fetch sales data");
      }

      const data = await response.json();

      const headers = [
        "id",
        "product_name",
        "category",
        "amount",
        "quantity",
        "sale_date",
        "region"
      ];

      const csvRows = [
        headers.join(","),
        ...data.map((row) =>
          headers
            .map((header) => escapeCSV(row[header]))
            .join(",")
        )
      ];

      const blob = new Blob(
        [csvRows.join("\n")],
        {
          type: "text/csv;charset=utf-8;"
        }
      );

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = "sales_report.csv";

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export Error:", error);

      alert("CSV export failed");
    }
  };

  // ===============================
  // PDF EXPORT
  // ===============================

  const handlePDFExport = () => {
    const doc = new jsPDF();

    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, 210, 42, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(19);

    doc.text(
      "Business Intelligence Dashboard",
      20,
      18
    );

    doc.setFontSize(11);

    doc.text(
      "Data Analytics & Business Insights",
      20,
      28
    );

    doc.setTextColor(31, 41, 55);

    doc.setFontSize(11);

    doc.text(
      `Category: ${selectedCategory}`,
      20,
      52
    );

    doc.text(
      `Month: ${
        selectedMonth === "All"
          ? "All Months"
          : formatMonth(selectedMonth)
      }`,
      20,
      60
    );

    doc.text(
      `Search: ${searchTerm || "None"}`,
      20,
      68
    );

    doc.setFontSize(16);

    doc.text("Dashboard Summary", 20, 82);

    doc.setFontSize(12);

    doc.text(
      `Total Sales: Rs. ${filteredTotalSales.toLocaleString(
        "en-IN",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )}`,
      20,
      95
    );

    doc.text(
      `Total Orders: ${filteredTotalOrders}`,
      20,
      105
    );

    doc.text(
      `Total Quantity: ${filteredTotalQuantity}`,
      20,
      115
    );

    doc.text(
      `Average Sale: Rs. ${filteredAverageSale.toLocaleString(
        "en-IN",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )}`,
      20,
      125
    );

    doc.line(20, 133, 190, 133);

    doc.setFontSize(15);

    doc.text("Sales by Category", 20, 147);

    let y = 158;

    Object.entries(categoryTotals).forEach(
      ([category, total]) => {
        doc.setFontSize(11);

        doc.text(
          `${category}: Rs. ${Number(total).toLocaleString(
            "en-IN"
          )}`,
          25,
          y
        );

        y += 8;
      }
    );

    y += 5;

    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(15);

    doc.text("Sales by Region", 20, y);

    y += 11;

    Object.entries(regionTotals).forEach(
      ([region, total]) => {
        doc.setFontSize(11);

        doc.text(
          `${region}: Rs. ${Number(total).toLocaleString(
            "en-IN"
          )}`,
          25,
          y
        );

        y += 8;
      }
    );

    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);

    doc.text(
      "Generated by Business Intelligence Dashboard",
      20,
      285
    );

    doc.save("business_intelligence_report.pdf");
  };

  // ===============================
  // RESET FILTERS
  // ===============================

  const resetFilters = () => {
    setSelectedCategory("All");
    setSelectedMonth("All");
    setSearchTerm("");
    setCurrentPage(1);
  };

  // ===============================
  // LOADING SCREEN
  // ===============================

  if (loading || !dashboard) {
    return (
      <h2 className="loading">
        Loading Dashboard...
      </h2>
    );
  }

  // ===============================
  // MAIN UI
  // ===============================

  return (
    <div className="dashboard">

      {/* ===============================
          DATA MANAGEMENT
      =============================== */}

      <div className="upload-section">

        <div className="section-heading">

          <span className="section-icon">
            📊
          </span>

          <div>

            <h2>Sales Data Management</h2>

            <p>
              Import your data and download business reports
            </p>

          </div>

        </div>

        <div className="data-buttons">

          <div className="data-action">

            <h3>Import Sales Data</h3>

            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
            />

          </div>

          <div className="data-action">

            <h3>Export Sales Report</h3>

            <button
              className="export-button"
              onClick={handleCSVExport}
            >
              Export CSV Report
            </button>

          </div>

          <div className="data-action">

            <h3>PDF Report</h3>

            <button
              className="pdf-button"
              onClick={handlePDFExport}
            >
              Download PDF Report
            </button>

          </div>

        </div>

      </div>

      {/* ===============================
          HEADER
      =============================== */}

      <header>

        <p className="eyebrow">
          ANALYTICS & BUSINESS INTELLIGENCE
        </p>

        <h1>
          Business Intelligence Dashboard
        </h1>

        <p className="subtitle">
          Data Analytics & Business Insights
        </p>

      </header>

      {/* ===============================
          FILTERS
      =============================== */}

      <div className="filter-section">

        <div>

          <h3>Dashboard Filters</h3>

          <p>
            Analyze sales performance by category and month.
          </p>

        </div>

        <div className="filters">

          <label>

            Category

            <select
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(event.target.value)
              }
            >

              <option value="All">
                All Categories
              </option>

              {dashboard.categories.map((item) => (

                <option
                  key={item.category}
                  value={item.category}
                >
                  {item.category}
                </option>

              ))}

            </select>

          </label>

          <label>

            Month

            <select
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(event.target.value)
              }
            >

              <option value="All">
                All Months
              </option>

              {monthOptions.map((month) => (

                <option
                  key={month}
                  value={month}
                >
                  {formatMonth(month)}
                </option>

              ))}

            </select>

          </label>

          <button
            className="reset-button"
            onClick={resetFilters}
          >
            Reset Filters
          </button>

        </div>

      </div>

      {/* ===============================
          CUSTOM DASHBOARD CONTROLS
      =============================== */}

      <div className="filter-section">

        <div>

          <h3>Custom Dashboard</h3>

          <p>
            Choose which dashboard sections you want to display.
          </p>

        </div>

        <div className="filters">

          <label>

            <input
              type="checkbox"
              checked={showCategoryChart}
              onChange={(event) =>
                setShowCategoryChart(event.target.checked)
              }
            />

            Sales by Category

          </label>

          <label>

            <input
              type="checkbox"
              checked={showRegionChart}
              onChange={(event) =>
                setShowRegionChart(event.target.checked)
              }
            />

            Sales by Region

          </label>

          <label>

            <input
              type="checkbox"
              checked={showMonthlyChart}
              onChange={(event) =>
                setShowMonthlyChart(event.target.checked)
              }
            />

            Monthly Sales

          </label>

          <label>

            <input
              type="checkbox"
              checked={showSalesTable}
              onChange={(event) =>
                setShowSalesTable(event.target.checked)
              }
            />

            Sales Data

          </label>

        </div>

      </div>

      {/* ===============================
          KPI CARDS
      =============================== */}

      <div className="cards">

        {/* TOTAL SALES */}

        <div className="card">

          <span className="card-icon sales-icon">
            ₹
          </span>

          <div>

            <h3>Total Sales</h3>

            <h2>
              ₹
              {filteredTotalSales.toLocaleString(
                "en-IN",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }
              )}
            </h2>

            <p className="kpi-subtext">
              ↑ Revenue generated
            </p>
            

          </div>

        </div>

        {/* TOTAL ORDERS */}

        <div className="card">

          <span className="card-icon orders-icon">
            ↗
          </span>

          <div>

            <h3>Total Orders</h3>

            <h2>
              {filteredTotalOrders}
            </h2>

            <p className="kpi-subtext">
              Total transactions
            </p>

          </div>

        </div>

        {/* TOTAL QUANTITY */}

        <div className="card">

          <span className="card-icon quantity-icon">
            ▣
          </span>

          <div>

            <h3>Total Quantity</h3>

            <h2>
              {filteredTotalQuantity}
            </h2>

            <p className="kpi-subtext">
              Units sold
            </p>

          </div>

        </div>

        {/* AVERAGE SALE */}

        <div className="card">

          <span className="card-icon average-icon">
            ◉
          </span>

          <div>

            <h3>Average Sale</h3>

            <h2>
              ₹
              {filteredAverageSale.toLocaleString(
                "en-IN",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }
              )}
            </h2>

            <p className="kpi-subtext">
              Average order value
            </p>

          </div>

        </div>

      </div>

      {/* ===============================
          CHARTS
      =============================== */}

      <div className="charts">

        {showCategoryChart && (

          <div className="chart-box">

            <div className="chart-header">

              <h2>Sales by Category</h2>

              <p>
                Revenue distribution across categories
              </p>

            </div>

            <div className="chart-container">

              <Bar
                data={categoryChartData}
                options={chartOptions}
              />

            </div>

          </div>

        )}

        {showRegionChart && (

          <div className="chart-box">

            <div className="chart-header">

              <h2>Sales by Region</h2>

              <p>
                Regional revenue distribution
              </p>

            </div>

            <div className="chart-container doughnut-container">

              <Doughnut
                data={regionChartData}
                options={doughnutOptions}
              />

            </div>

          </div>

        )}

        {showMonthlyChart && (

          <div className="chart-box chart-wide">

            <div className="chart-header">

              <h2>Monthly Sales</h2>

              <p>
                Sales trend over time
              </p>

            </div>

            <div className="chart-container">

              <Line
                data={monthlyChartData}
                options={lineOptions}
              />

            </div>

          </div>

        )}

      </div>
            {/* ===============================
          TOP SELLING PRODUCTS
      =============================== */}

      <div className="top-products-section">

        <div className="top-products-header">

          <div>
            <h2>Top-Selling Products</h2>

            <p>
              Products ranked by total sales revenue
            </p>
          </div>

          <span className="top-products-badge">
            Top 5
          </span>

        </div>

        <div className="top-products-list">

          {topProducts.length > 0 ? (

            topProducts.map((item, index) => (

              <div
                className="top-product-row"
                key={item.product}
              >

                <div className="product-rank">
                  #{index + 1}
                </div>

                <div className="product-info">

                  <h3>
                    {item.product}
                  </h3>

                  <div className="product-progress">

                    <span
                      style={{
                        width: `${
                          topProducts[0].total > 0
                            ? (item.total / topProducts[0].total) * 100
                            : 0
                        }%`
                      }}
                    ></span>

                  </div>

                </div>

                <div className="product-sales">

                  ₹
                  {Number(item.total).toLocaleString(
                    "en-IN",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }
                  )}

                </div>

              </div>

            ))

          ) : (

            <p className="no-products">
              No product data available.
            </p>

          )}

        </div>

      </div>

      {/* ===============================
          SALES DATA TABLE
      =============================== */}

      {showSalesTable && (

        <div className="sales-table-section">

          <div className="table-header">

            <div>

              <h2>Sales Data</h2>

              <p>
                Detailed sales records based on selected filters
              </p>

            </div>

            <div className="table-actions">

              <input
                type="text"
                placeholder="Search product, category or region"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
              />

              <span className="record-count">
                {filteredSales.length} Records
              </span>

            </div>

          </div>

          <div className="table-wrapper">

            <table>

              <thead>

                <tr>

                  <th>Product</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Quantity</th>
                  <th>Sale Date</th>
                  <th>Region</th>

                </tr>

              </thead>

              <tbody>

                {currentRecords.length > 0 ? (

                  currentRecords.map((item) => (

                    <tr key={item.id}>

                      <td>
                        {item.product_name}
                      </td>

                      <td>

                        <span className="category-badge">
                          {item.category}
                        </span>

                      </td>

                      <td>

                        ₹
                        {Number(item.amount).toLocaleString(
                          "en-IN",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }
                        )}

                      </td>

                      <td>
                        {item.quantity}
                      </td>

                      <td>

                        {new Date(
                          item.sale_date
                        ).toLocaleDateString("en-IN")}

                      </td>

                      <td>
                        {item.region}
                      </td>

                    </tr>

                  ))

                ) : (

                  <tr>

                    <td colSpan="6">
                      No sales records found.
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

          {/* PAGINATION */}

          <div className="pagination">

            <button
              disabled={currentPage === 1}
              onClick={() =>
                setCurrentPage((page) => page - 1)
              }
            >
              ← Previous
            </button>

            {Array.from(
              { length: totalPages },
              (_, index) => index + 1
            ).map((page) => (

              <button
                key={page}
                className={
                  currentPage === page
                    ? "active-page"
                    : ""
                }
                onClick={() =>
                  setCurrentPage(page)
                }
              >
                {page}
              </button>

            ))}

            <button
              disabled={
                currentPage === totalPages ||
                totalPages === 0
              }
              onClick={() =>
                setCurrentPage((page) => page + 1)
              }
            >
              Next →
            </button>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;