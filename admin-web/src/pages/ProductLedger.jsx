

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback
} from "react";

import { api } from "../api";

import {
  Download,
  RefreshCw,
  Package
} from "lucide-react";


export default function ProductLedger() {

  // =====================================================
  // STATES
  // =====================================================

  const [godowns, setGodowns] =
    useState([]);

  const [selectedGodown, setSelectedGodown] =
    useState("");

  const [products, setProducts] =
    useState([]);

  const [selectedProduct, setSelectedProduct] =
    useState("");

  const [ledger, setLedger] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [openingStock, setOpeningStock] =
    useState(0);

  const [currentStock, setCurrentStock] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);
const [showProductDropdown, setShowProductDropdown] =
  useState(false);

const [highlightedIndex, setHighlightedIndex] =
  useState(-1);

const productItemRefs = React.useRef([]);


  // =====================================================
  // LOAD GODOWNS
  // =====================================================

  const loadGodowns = useCallback(async () => {

    try {

      const res =
        await api.get(
          "/product-ledger/godowns"
        );

      setGodowns(
        res.data || []
      );

    } catch (err) {

      console.error(
        "Godowns error:",
        err
      );

    }

  }, []);


  // =====================================================
  // LOAD PRODUCTS FOR SELECTED GODOWN
  // =====================================================

  const loadProducts = useCallback(async () => {

    if (!selectedGodown) {

      setProducts([]);

      setSelectedProduct("");

      return;

    }


    try {

      const res =
        await api.get(
          "/product-ledger/products",
          {
            params: {
              godownId:
                selectedGodown
            }
          }
        );


      const list =
        res.data || [];


   setProducts(list);
setSelectedProduct("");
setSearch("");
setShowProductDropdown(false);

      // Select first product automatically

     

    } catch (err) {

      console.error(
        "Products error:",
        err
      );

      setProducts([]);

      setSelectedProduct("");

    }

  }, [selectedGodown]);


  // =====================================================
  // LOAD LEDGER
  // =====================================================

  const loadLedger = useCallback(async () => {

    if (
      !selectedGodown ||
      !selectedProduct
    ) {

      setLedger([]);

      setOpeningStock(0);

      setCurrentStock(0);

      return;

    }


    setLoading(true);


    try {

      const res =
        await api.get(
          `/product-ledger/${selectedProduct}`,
          {
            params: {

              godownId:
                selectedGodown,

              startDate,

              endDate

            }
          }
        );


      setLedger(
        res.data?.ledger || []
      );


      setOpeningStock(
        Number(
          res.data?.openingStock || 0
        )
      );


      setCurrentStock(
        Number(
          res.data?.currentStock || 0
        )
      );


    } catch (err) {

      console.error(
        "Ledger error:",
        err
      );

      setLedger([]);

      setOpeningStock(0);

      setCurrentStock(0);

    } finally {

      setLoading(false);

    }

  }, [
    selectedGodown,
    selectedProduct,
    startDate,
    endDate
  ]);


  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {

    loadGodowns();

  }, [
    loadGodowns
  ]);


  // =====================================================
  // WHEN GODOWN CHANGES
  // =====================================================

  useEffect(() => {

    loadProducts();

  }, [
    loadProducts
  ]);


  // =====================================================
  // WHEN PRODUCT / DATE CHANGES
  // =====================================================

  useEffect(() => {

    loadLedger();

  }, [
    loadLedger
  ]);


  // =====================================================
  // REFRESH
  // =====================================================

  const refresh = async () => {

    setRefreshing(true);

    await loadGodowns();

    if (selectedGodown) {
      await loadProducts();
    }

    if (
      selectedGodown &&
      selectedProduct
    ) {
      await loadLedger();
    }

    setRefreshing(false);

  };


  // =====================================================
  // SEARCH PRODUCT
  // =====================================================

  const filteredProducts =
    useMemo(() => {

      const text =
        search
          .trim()
          .toLowerCase();


      if (!text) {
        return products;
      }


      return products.filter(
        product =>

          product.name
            ?.toLowerCase()
            .includes(text)

          ||

          product.stockGroup
            ?.toLowerCase()
            .includes(text)

      );

    }, [
      products,
      search
    ]);

// =====================================================
// AUTO SCROLL HIGHLIGHTED PRODUCT INTO VIEW
// =====================================================

useEffect(() => {

  if (
    highlightedIndex >= 0 &&
    productItemRefs.current[highlightedIndex]
  ) {

    productItemRefs.current[
      highlightedIndex
    ].scrollIntoView({
      block: "nearest",
      behavior: "auto"
    });

  }

}, [highlightedIndex]);
  // =====================================================
  // SORT LEDGER
  // =====================================================

  const sortedLedger =
    useMemo(() => {

      return [...ledger].sort(
        (a, b) =>
          new Date(a.date) -
          new Date(b.date)
      );

    }, [
      ledger
    ]);


  // =====================================================
  // TOTALS
  // =====================================================

  const totals =
    useMemo(() => {

      let inward = 0;

      let outward = 0;


      sortedLedger.forEach(
        row => {

          inward +=
            Number(
              row.qtyIn || 0
            );


          outward +=
            Number(
              row.qtyOut || 0
            );

        }
      );


      return {

        inward,

        outward,

        closing:
          openingStock +
          inward -
          outward

      };

    }, [
      sortedLedger,
      openingStock
    ]);


  // =====================================================
  // EXPORT EXCEL
  // =====================================================

  const exportExcel = async () => {

    if (
      !selectedGodown ||
      !selectedProduct
    ) {

      alert(
        "Please select Godown and Product"
      );

      return;

    }


    try {

      const res =
        await api.get(

          `/product-ledger/${selectedProduct}/export/excel`,

          {

            params: {

              godownId:
                selectedGodown,

              startDate,

              endDate

            },

            responseType:
              "blob"

          }

        );


      const url =
        window.URL.createObjectURL(
          new Blob([
            res.data
          ])
        );


      const a =
        document.createElement("a");


      a.href = url;


      const product =
        products.find(
          p =>
            p._id ===
            selectedProduct
        );


      a.download =
        `${product?.name || "Product"}-Ledger.xlsx`;


      document.body.appendChild(a);

      a.click();

      a.remove();


      window.URL.revokeObjectURL(
        url
      );

    } catch (err) {

      console.error(err);

      alert(
        "Export Failed"
      );

    }

  };


  // =====================================================
  // SELECTED PRODUCT
  // =====================================================

  const selectedProductData =
    products.find(
      product =>
        product._id ===
        selectedProduct
    );


  // =====================================================
  // UI
  // =====================================================

  return (

    <div
      style={{
        height: "100vh",
        background: "#f1f5f9",
        display: "flex",
        flexDirection: "column",
        fontFamily:
          "Inter, Arial, sans-serif"
      }}
    >

      {/* =================================================
          TOP HEADER
      ================================================= */}

      <div
        style={{
          padding: "18px 28px",
          background: "#fff",
          borderBottom:
            "1px solid #e2e8f0",

          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",

          gap: 20
        }}
      >

        {/* TITLE */}

        <div>

          <h1
            style={{
              margin: 0,
              fontSize: 23,
              fontWeight: 900,
              color: "#0f172a"
            }}
          >

            PRODUCT{" "}

            <span
              style={{
                color: "#6366f1"
              }}
            >
              LEDGER
            </span>

          </h1>

          <div
            style={{
              fontSize: 12,
              color: "#64748b",
              marginTop: 4
            }}
          >
            Godown wise stock movement
          </div>

        </div>


        {/* FILTERS */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-end"
          }}
        >

          {/* GODOWN */}

          <select
            value={selectedGodown}
            onChange={(e) => {

  setSelectedGodown(
    e.target.value
  );

  setSelectedProduct("");

  setSearch("");

  setLedger([]);

  setShowProductDropdown(false);

}}
            style={{
              width: 190,
              padding:
                "10px 12px",
              borderRadius: 9,
              border:
                "1px solid #cbd5e1",
              background: "#fff",
              fontWeight: 600,
              outline: "none"
            }}
          >

            <option value="">
              Select Godown
            </option>

            {godowns.map(
              godown => (

                <option
                  key={godown._id}
                  value={godown._id}
                >
                  {godown.name}
                </option>

              )
            )}

          </select>


      {/* =====================================================
    PRODUCT SEARCH DROPDOWN
===================================================== */}

<div
  style={{
    position: "relative",
    width: 250
  }}
>

  {/* SEARCH INPUT */}

  <input
    value={
      selectedProduct
        ? (
            products.find(
              p => p._id === selectedProduct
            )?.name || ""
          )
        : search
    }

    disabled={!selectedGodown}

    onChange={(e) => {

      const value = e.target.value;

      setSearch(value);
      setHighlightedIndex(
  value.trim() ? 0 : -1
);

      // Clear selected product while searching
      setSelectedProduct("");

      // Start highlighting first result
      setHighlightedIndex(
        value.trim() ? 0 : -1
      );

      setShowProductDropdown(
        true
      );

      // Reset refs
      productItemRefs.current = [];

    }}

    onFocus={() => {

      if (!selectedGodown) return;

      setShowProductDropdown(true);

      if (
        filteredProducts.length > 0
      ) {

        setHighlightedIndex(
          highlightedIndex >= 0
            ? highlightedIndex
            : 0
        );

      }

    }}

    onKeyDown={(e) => {

      if (!selectedGodown) return;


      // =================================================
      // ARROW DOWN
      // =================================================

      if (e.key === "ArrowDown") {

        e.preventDefault();

        if (
          filteredProducts.length === 0
        ) {
          return;
        }

        setShowProductDropdown(true);

        setHighlightedIndex(prev => {

          if (
            prev < 0 ||
            prev >=
              filteredProducts.length - 1
          ) {

            return 0;

          }

          return prev + 1;

        });

      }


      // =================================================
      // ARROW UP
      // =================================================

      else if (e.key === "ArrowUp") {

        e.preventDefault();

        if (
          filteredProducts.length === 0
        ) {
          return;
        }

        setShowProductDropdown(true);

        setHighlightedIndex(prev => {

          if (
            prev <= 0
          ) {

            return (
              filteredProducts.length - 1
            );

          }

          return prev - 1;

        });

      }


      // =================================================
      // ENTER
      // =================================================

      else if (e.key === "Enter") {

        e.preventDefault();

        if (
          showProductDropdown &&
          highlightedIndex >= 0 &&
          filteredProducts[
            highlightedIndex
          ]
        ) {

          const product =
            filteredProducts[
              highlightedIndex
            ];

          setSelectedProduct(
            product._id
          );

          setSearch(
            product.name
          );

          setShowProductDropdown(
            false
          );

          setHighlightedIndex(-1);

        }

      }


      // =================================================
      // ESCAPE
      // =================================================

      else if (e.key === "Escape") {

        e.preventDefault();

        setShowProductDropdown(
          false
        );

        setHighlightedIndex(-1);

      }

    }}

    placeholder="Search Product..."

    style={{
      width: "100%",
      boxSizing: "border-box",

      padding:
        "10px 13px",

      borderRadius: 9,

      border:
        "1px solid #cbd5e1",

      background:
        selectedGodown
          ? "#fff"
          : "#f1f5f9",

      outline: "none",

      fontWeight: 600
    }}

  />


  {/* =====================================================
      DROPDOWN
  ===================================================== */}

  {showProductDropdown &&
    selectedGodown && (

      <div
        style={{
          position: "absolute",

          top:
            "calc(100% + 5px)",

          left: 0,

          right: 0,

          background: "#fff",

          border:
            "1px solid #cbd5e1",

          borderRadius: 9,

          boxShadow:
            "0 8px 20px rgba(0,0,0,0.12)",

          /*
           * IMPORTANT
           * Fixed max height allows
           * the dropdown to scroll.
           */
          maxHeight: 280,
height: 280,
overflowY: "auto",
overflowX: "hidden",

          zIndex: 9999,

          /*
           * Makes mouse-wheel scrolling
           * work properly.
           */
          overscrollBehavior:
            "contain",

          scrollbarWidth:
            "thin"
        }}
      >

        {filteredProducts.length > 0 ? (

          filteredProducts.map(
            (product, index) => (

              <div
                key={product._id}

                /*
                 * IMPORTANT:
                 * Store every product DOM
                 * element in a ref.
                 */
                ref={(el) => {

                  productItemRefs.current[
                    index
                  ] = el;

                }}

                onMouseDown={(e) => {

                  /*
                   * Prevent input from losing
                   * focus before selection.
                   */
                  e.preventDefault();

                  setSelectedProduct(
                    product._id
                  );

                  setSearch(
                    product.name
                  );

                  setShowProductDropdown(
                    false
                  );

                  setHighlightedIndex(
                    -1
                  );

                }}

                onMouseEnter={() => {

                  setHighlightedIndex(
                    index
                  );

                }}

                style={{
                  padding:
                    "11px 13px",

                  minHeight: 48,

                  boxSizing:
                    "border-box",

                  cursor:
                    "pointer",

                  background:
                    index ===
                    highlightedIndex
                      ? "#eef2ff"
                      : "#fff",

                  borderBottom:
                    "1px solid #f1f5f9",

                  fontSize: 14,

                  fontWeight:
                    index ===
                    highlightedIndex
                      ? 800
                      : 600,

                  color:
                    "#0f172a",

                  transition:
                    "background 0.1s ease"
                }}
              >

                {/* PRODUCT NAME */}

                <div>
                  {product.name}
                </div>


                {/* STOCK GROUP */}

                {product.stockGroup && (

                  <div
                    style={{
                      fontSize: 11,

                      color:
                        "#64748b",

                      marginTop: 3,

                      fontWeight: 500
                    }}
                  >
                    {product.stockGroup}
                  </div>

                )}

              </div>

            )

          )

        ) : (

          <div
            style={{
              padding:
                "14px",

              color:
                "#64748b",

              fontSize: 13,

              fontWeight: 600,

              textAlign: "center"
            }}
          >
            No products found
          </div>

        )}

      </div>

    )}

</div>

          {/* START DATE */}

          <input
            type="date"
            value={startDate}
            onChange={(e) =>
              setStartDate(
                e.target.value
              )
            }
            style={{
              padding:
                "10px 12px",
              borderRadius: 9,
              border:
                "1px solid #cbd5e1",
              background: "#fff"
            }}
          />


          {/* END DATE */}

          <input
            type="date"
            value={endDate}
            onChange={(e) =>
              setEndDate(
                e.target.value
              )
            }
            style={{
              padding:
                "10px 12px",
              borderRadius: 9,
              border:
                "1px solid #cbd5e1",
              background: "#fff"
            }}
          />


          {/* REFRESH */}

          <button
            onClick={refresh}
            disabled={refreshing}
            style={{
              width: 42,
              height: 42,
              border: 0,
              borderRadius: 9,
              background: "#e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >

            <RefreshCw
              size={17}
              style={{
                animation:
                  refreshing
                    ? "spin 1s linear infinite"
                    : "none"
              }}
            />

          </button>


          {/* EXPORT */}

          <button
            onClick={exportExcel}
            disabled={
              !selectedGodown ||
              !selectedProduct
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background:
                !selectedGodown ||
                !selectedProduct
                  ? "#94a3b8"
                  : "#0f172a",
              color: "#fff",
              padding:
                "10px 16px",
              border: 0,
              borderRadius: 9,
              fontWeight: 800,
              cursor:
                !selectedGodown ||
                !selectedProduct
                  ? "not-allowed"
                  : "pointer"
            }}
          >

            <Download
              size={15}
            />

            EXPORT

          </button>

        </div>

      </div>


      {/* =================================================
          PRODUCT INFORMATION
      ================================================= */}

      <div
        style={{
          padding:
            "16px 28px",
          background: "#fff",
          borderBottom:
            "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between"
        }}
      >

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14
          }}
        >

          {selectedProductData?.imageUrl ? (

            <img
              src={
                selectedProductData.imageUrl
              }
              alt=""
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                objectFit: "cover"
              }}
            />

          ) : (

            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: "#eef2ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >

              <Package
                size={23}
                color="#6366f1"
              />

            </div>

          )}


          <div>

            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "#0f172a"
              }}
            >

              {selectedProductData?.name ||
                "Select a Product"}

            </div>


            <div
              style={{
                color: "#64748b",
                fontSize: 13,
                marginTop: 3
              }}
            >

              {godowns.find(
                g =>
                  g._id ===
                  selectedGodown
              )?.name || ""}

              {selectedProductData?.unit
                ? ` • ${selectedProductData.unit}`
                : ""}

            </div>

          </div>

        </div>


        {/* SUMMARY */}

        <div
          style={{
            display: "flex",
            gap: 28
          }}
        >

          <Summary
            label="Opening"
            value={openingStock}
          />

          <Summary
            label="Inward"
            value={`+${totals.inward}`}
            green
          />

          <Summary
            label="Outward"
            value={`-${totals.outward}`}
            red
          />

          <Summary
            label="Current Stock"
            value={currentStock}
            blue
          />

        </div>

      </div>


      {/* =================================================
          LEDGER
      ================================================= */}

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: 24
        }}
      >

        {!selectedGodown ? (

          <EmptyMessage
            text="Please select a Godown first"
          />

        ) : !selectedProduct ? (

          <EmptyMessage
            text="Please select a Product"
          />

        ) : loading ? (

          <EmptyMessage
            text="Loading Ledger..."
          />

        ) : sortedLedger.length === 0 ? (

          <EmptyMessage
            text="No transactions found for the selected filters"
          />

        ) : (

          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
              border:
                "1px solid #e2e8f0"
            }}
          >

            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse"
              }}
            >

              <thead>

                <tr
                  style={{
                    background:
                      "#f8fafc"
                  }}
                >

                  <th style={thStyle}>
                    Date
                  </th>

                  <th style={thStyle}>
                    Type
                  </th>

                  <th style={thStyle}>
                    Reference
                  </th>

                  <th
                    style={{
                      ...thStyle,
                      textAlign: "right"
                    }}
                  >
                    Inward
                  </th>

                  <th
                    style={{
                      ...thStyle,
                      textAlign: "right"
                    }}
                  >
                    Outward
                  </th>

                  <th
                    style={{
                      ...thStyle,
                      textAlign: "right"
                    }}
                  >
                    Balance
                  </th>

                </tr>

              </thead>


              <tbody>

                {sortedLedger.map(
                  (row, index) => (

                    <tr
                      key={`${row.date}-${index}`}
                      style={{
                        borderTop:
                          "1px solid #f1f5f9"
                      }}
                    >

                      <td
                        style={tdStyle}
                      >
                        {new Date(
                          row.date
                        ).toLocaleDateString(
                          "en-IN"
                        )}
                      </td>


                      <td
                        style={{
                          ...tdStyle,
                          fontWeight: 700
                        }}
                      >
                        {row.type}
                      </td>


                      <td
                        style={tdStyle}
                      >
                        {row.reference ||
                          "-"}
                      </td>


                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          color: "#16a34a",
                          fontWeight: 800
                        }}
                      >

                        {Number(
                          row.qtyIn || 0
                        ) > 0

                          ? `+${row.qtyIn}`

                          : "-"}

                      </td>


                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          color: "#dc2626",
                          fontWeight: 800
                        }}
                      >

                        {Number(
                          row.qtyOut || 0
                        ) > 0

                          ? `-${row.qtyOut}`

                          : "-"}

                      </td>


                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          fontWeight: 900,
                          color: "#0f172a"
                        }}
                      >
                        {row.balance}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>


      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>

    </div>

  );

}


// =====================================================
// SMALL COMPONENTS
// =====================================================

function Summary({
  label,
  value,
  green,
  red,
  blue
}) {

  return (

    <div
      style={{
        textAlign: "right"
      }}
    >

      <div
        style={{
          fontSize: 11,
          color: "#64748b",
          fontWeight: 700,
          textTransform:
            "uppercase"
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 3,
          fontSize: 17,
          fontWeight: 900,

          color:
            green
              ? "#16a34a"
              : red
              ? "#dc2626"
              : blue
              ? "#2563eb"
              : "#0f172a"
        }}
      >
        {value}
      </div>

    </div>

  );

}


function EmptyMessage({
  text
}) {

  return (

    <div
      style={{
        height: "100%",
        minHeight: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#64748b",
        fontWeight: 700,
        fontSize: 16
      }}
    >

      {text}

    </div>

  );

}


const thStyle = {

  padding: "14px 16px",

  textAlign: "left",

  fontSize: 12,

  color: "#475569",

  textTransform:
    "uppercase",

  letterSpacing:
    "0.04em",

  fontWeight: 800

};


const tdStyle = {

  padding: "14px 16px",

  fontSize: 14,

  color: "#334155"

};