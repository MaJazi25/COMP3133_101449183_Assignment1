const typeDefs = `#graphql
type FieldError {
  field: String
  message: String!
}

type User {
  _id: ID!
  username: String!
  email: String!
  created_at: String
  updated_at: String
}

type Employee {
  _id: ID!
  first_name: String!
  last_name: String!
  email: String!
  gender: String!
  designation: String!
  salary: Float!
  date_of_joining: String!
  department: String!
  employee_photo: String
  created_at: String
  updated_at: String
}

type AuthResponse {
  success: Boolean!
  message: String!
  user: User
  errors: [FieldError!]
}

type EmployeeResponse {
  success: Boolean!
  message: String!
  employee: Employee
  errors: [FieldError!]
}

type EmployeesResponse {
  success: Boolean!
  message: String!
  employees: [Employee!]!
  errors: [FieldError!]
}

type DeleteResponse {
  success: Boolean!
  message: String!
  errors: [FieldError!]
}

input SignupInput {
  username: String!
  email: String!
  password: String!
}

input EmployeeInput {
  first_name: String!
  last_name: String!
  email: String!
  gender: String!
  designation: String!
  salary: Float!
  date_of_joining: String!
  department: String!
  employee_photo: String
}

input EmployeeUpdateInput {
  first_name: String
  last_name: String
  email: String
  gender: String
  designation: String
  salary: Float
  date_of_joining: String
  department: String
  employee_photo: String
}

type Query {
  login(usernameOrEmail: String!, password: String!): AuthResponse!
  getAllEmployees: EmployeesResponse!
  searchEmployeeByEid(eid: ID!): EmployeeResponse!
  searchEmployeeByDesignationOrDepartment(designation: String, department: String): EmployeesResponse!
}

type Mutation {
  signup(input: SignupInput!): AuthResponse!
  addNewEmployee(input: EmployeeInput!): EmployeeResponse!
  updateEmployeeByEid(eid: ID!, input: EmployeeUpdateInput!): EmployeeResponse!
  deleteEmployeeByEid(eid: ID!): DeleteResponse!
}
`;

module.exports = typeDefs;
