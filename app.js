import express, {json} from "express";
import chalk from "chalk";

const app = express();

app.use(json())


app.listen(3000, () => {
    console.log(chalk.bold.green("Server is running on port 3000"));
});