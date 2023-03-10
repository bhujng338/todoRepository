const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const date = require("date-fns");
const isValid = require("date-fns/isValid");
var format = require("date-fns/format");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();
////

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined &&
    requestQuery.status !== undefined &&
    requestQuery.category !== undefined
  );
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const isPriority = (requestQuery) => {
  return (
    requestQuery.priority === "HIGH" ||
    requestQuery.priority === "MEDIUM" ||
    requestQuery.priority === "LOW"
  );
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const isStatus = (requestQuery) => {
  return (
    requestQuery.status === "TO DO" ||
    requestQuery.status === "IN PROGRESS" ||
    requestQuery.status === "DONE"
  );
};
const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};
const isCategory = (requestQuery) => {
  return (
    requestQuery.category === "WORK" ||
    requestQuery.category === "HOME" ||
    requestQuery.category === "LEARNING"
  );
};

const hasDateProperty = (requestQuery) => {
  return requestQuery.date !== undefined;
};
const isDueDate = (requestQuery) => {
  return isValid(new Date(requestQuery.date));
};

////
app.get("/todos/", async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { search_q = "", priority, status, category } = request.query;

  switch (true) {
    case hasPriorityAndStatusProperties(request.query) &&
      isPriority(request.query) &&
      isStatus(request.query) &&
      isCategory(request.query):
      getTodosQuery = `
            SELECT
                id, todo, priority, status,category,due_date AS dueDate
            FROM
                todo 
            WHERE
                todo LIKE '%${search_q}%'
                AND status = '${status}'
                AND priority = '${priority}';`;
      break;

    case hasPriorityProperty(request.query):
      if (isPriority(request.query)) {
        getTodosQuery = `
                    SELECT
                        id, todo, priority, status,category,due_date AS dueDate
                    FROM
                        todo 
                    WHERE
                        todo LIKE '%${search_q}%'
                        AND priority = '${priority}';`;
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case hasStatusProperty(request.query):
      if (isStatus(request.query)) {
        getTodosQuery = `
                    SELECT
                        id, todo, priority, status,category,due_date AS dueDate
                    FROM
                        todo 
                    WHERE
                        todo LIKE '%${search_q}%'
                        AND status = '${status}';`;
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case hasCategoryProperty(request.query):
      if (isCategory(request.query)) {
        getTodosQuery = `
                    SELECT
                        id, todo, priority, status,category,due_date AS dueDate
                    FROM
                        todo 
                    WHERE
                        todo LIKE '%${search_q}%'
                        AND category = '${category}';`;
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case hasDateProperty(request.query):
      if (isDueDate(request.query)) {
        const query = `SELECT id, todo, priority, status,category,due_date AS dueDate FROM todo WHERE due_date=${date};`;
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
      break;
    default:
      getTodosQuery = `
        SELECT
            id, todo, priority, status,category,due_date AS dueDate
        FROM
            todo 
        WHERE
            todo LIKE '%${search_q}%';`;
  }
  data = await database.all(getTodosQuery);
  response.send(data);
});

///API2

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const query = `SELECT * FROM todo WHERE id=${todoId};`;
  const dbUser = await database.get(query);
  response.send(dbUser);
});

///API3

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (date !== undefined) {
    const valid = isValid(new Date(date));
    if (valid) {
      const formatedDate = format(new Date(date), "yyyy-MM-dd");
      const query = `SELECT id, todo, priority, status,category,due_date AS dueDate FROM todo WHERE due_date="${formatedDate}";`;
      const dbUser = await database.all(query);
      response.send(dbUser);
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});
//API4

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const postTodoQuery = `
  INSERT INTO
    todo (id, todo, priority, status,category,due_date)
  VALUES
    (${id}, '${todo}', '${priority}', '${status}','${category}','${dueDate}');`;
  await database.run(postTodoQuery);
  response.send("Todo Successfully Added");
});

///api5

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  switch (true) {
    case hasStatusProperty(request.body):
      if (isStatus(request.body)) {
        updateColumn = "Status";
        break;
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }

    case requestBody.priority !== undefined:
      if (isPriority(request.body)) {
        updateColumn = "Priority";
        break;
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }

    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      if (isCategory(request.body)) {
        updateColumn = "Category";
        break;
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }

    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
  }
  const previousTodoQuery = `
    SELECT
      id, todo, priority, status,category,due_date AS dueDate
    FROM
      todo
    WHERE 
      id = ${todoId};`;
  const previousTodo = await database.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;

  const updateTodoQuery = `
    UPDATE
      todo
    SET
      todo='${todo}',
      priority='${priority}',
      status='${status}',
      category="${category}",
      due_date="${dueDate}"
    WHERE
      id = ${todoId};`;

  await database.run(updateTodoQuery);
  response.send(`${updateColumn} Updated`);
});

//API6

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
