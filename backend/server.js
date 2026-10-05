const express = require("express");
const cors = require("cors");
const pool = require("./db");
const multer = require("multer");
const csv = require("csv-parser");

const upload = multer({ storage: multer.memoryStorage()});
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Analytics Dashboard API is running"
    });
});

app.get("/api/sales", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM sales ORDER BY sale_date DESC"
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Database error"
        });
    }
});

app.get("/api/dashboard", async (req, res) => {
    try {
        const totalSales = await pool.query(
            "SELECT COALESCE(SUM(amount), 0) AS total_sales FROM sales"
        );

        const totalOrders = await pool.query(
            "SELECT COUNT(*) AS total_orders FROM sales"
        );

        const totalQuantity = await pool.query(
            "SELECT COALESCE(SUM(quantity), 0) AS total_quantity FROM sales"
        );

        const averageSale = await pool.query(
            "SELECT COALESCE(AVG(amount), 0) AS average_sale FROM sales"
        );

        const categories = await pool.query(`
            SELECT category, SUM(amount) AS total
            FROM sales
            GROUP BY category
            ORDER BY total DESC
        `);

        const regions = await pool.query(`
            SELECT region, SUM(amount) AS total
            FROM sales
            GROUP BY region
            ORDER BY total DESC
        `);

        res.json({
            totalSales: totalSales.rows[0].total_sales,
            totalOrders: totalOrders.rows[0].total_orders,
            totalQuantity: totalQuantity.rows[0].total_quantity,
            averageSale: averageSale.rows[0].average_sale,
            categories: categories.rows,
            regions: regions.rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Dashboard data error"
        });
    }
});

app.get("/api/monthly-sales", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                TO_CHAR(sale_date, 'YYYY-MM') AS month,
                SUM(amount) AS total
            FROM sales
            GROUP BY month
            ORDER BY month
        `);

        res.json(result.rows);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Monthly sales data error"
        });
    }
});

app.post("/api/upload-csv", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: "Please upload a CSV file"
            });
        }

        const rows = [];

        const stream = require("stream");

        const readable = new stream.Readable();
        readable.push(req.file.buffer);
        readable.push(null);

        readable
            .pipe(csv())
            .on("data", (row) => {
                rows.push(row);
            })
            .on("end", async () => {
                try {
                    for (const row of rows) {
                        await pool.query(
                            `INSERT INTO sales
                            (product_name, category, amount, quantity, sale_date, region)
                            VALUES ($1, $2, $3, $4, $5, $6)`,
                            [
                                row.product_name,
                                row.category,
                                row.amount,
                                row.quantity,
                                row.sale_date,
                                row.region
                            ]
                        );
                    }

                    res.json({
                        message: `${rows.length} records imported successfully`
                    });

                } catch (error) {
                    console.error(error);

                    res.status(500).json({
                        error: "Error inserting CSV data"
                    });
                }
            });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "CSV upload failed"
        });
    }
});

app.listen(process.env.PORT, () => {
    console.log(`Server running on http://localhost:${process.env.PORT}`);
});