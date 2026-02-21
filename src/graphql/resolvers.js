const { checkSchema, validationResult } = require("express-validator");
const User = require("../models/User");
const Employee = require("../models/Employee");
const cloudinary = require("../config/cloudinary");

const runValidation = async (data, schema) => {
  const req = { body: data };
  await checkSchema(schema).run(req);
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return result.array().map((e) => ({ field: e.path, message: e.msg }));
  }
  return [];
};

const signupSchema = {
  username: { in: ["body"], notEmpty: { errorMessage: "username is required" } },
  email: {
    in: ["body"],
    notEmpty: { errorMessage: "email is required" },
    isEmail: { errorMessage: "email must be valid" }
  },
  password: {
    in: ["body"],
    notEmpty: { errorMessage: "password is required" },
    isLength: { options: { min: 6 }, errorMessage: "password must be at least 6 characters" }
  }
};

const loginSchema = {
  usernameOrEmail: { in: ["body"], notEmpty: { errorMessage: "usernameOrEmail is required" } },
  password: { in: ["body"], notEmpty: { errorMessage: "password is required" } }
};

const employeeCreateSchema = {
  first_name: { in: ["body"], notEmpty: { errorMessage: "first_name is required" } },
  last_name: { in: ["body"], notEmpty: { errorMessage: "last_name is required" } },
  email: {
    in: ["body"],
    notEmpty: { errorMessage: "email is required" },
    isEmail: { errorMessage: "email must be valid" }
  },
  gender: {
    in: ["body"],
    notEmpty: { errorMessage: "gender is required" },
    isIn: { options: [["Male", "Female", "Other"]], errorMessage: "gender must be Male/Female/Other" }
  },
  designation: { in: ["body"], notEmpty: { errorMessage: "designation is required" } },
  salary: {
    in: ["body"],
    notEmpty: { errorMessage: "salary is required" },
    isFloat: { options: { min: 1000 }, errorMessage: "salary must be >= 1000" }
  },
  date_of_joining: { in: ["body"], notEmpty: { errorMessage: "date_of_joining is required" } },
  department: { in: ["body"], notEmpty: { errorMessage: "department is required" } }
};

const isUrl = (v) => typeof v === "string" && /^https?:\/\//i.test(v);

const uploadToCloudinaryIfNeeded = async (photoString) => {
  if (!photoString) return "";
  if (isUrl(photoString)) return photoString;
  const res = await cloudinary.uploader.upload(photoString, { folder: "comp3133_employees" });
  return res.secure_url || "";
};

const mapMongoDupError = (err) => {
  if (err && err.code === 11000) {
    const keys = Object.keys(err.keyPattern || err.keyValue || {});
    const field = keys[0] || "field";
    return [{ field, message: `${field} already exists` }];
  }
  return null;
};

const iso = (v) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);

const resolvers = {
  User: {
    created_at: (u) => iso(u.created_at),
    updated_at: (u) => iso(u.updated_at)
  },
  Employee: {
    date_of_joining: (e) => iso(e.date_of_joining),
    created_at: (e) => iso(e.created_at),
    updated_at: (e) => iso(e.updated_at)
  },

  Query: {
    login: async (_, args) => {
      const errors = await runValidation(args, loginSchema);
      if (errors.length) return { success: false, message: "Validation failed", user: null, errors };

      const identifier = args.usernameOrEmail.trim();
      const user = await User.findOne({
        $or: [{ username: identifier }, { email: identifier.toLowerCase() }]
      });

      if (!user) {
        return {
          success: false,
          message: "User not found",
          user: null,
          errors: [{ field: "usernameOrEmail", message: "Invalid username/email" }]
        };
      }

      const ok = await user.comparePassword(args.password);
      if (!ok) {
        return {
          success: false,
          message: "Invalid password",
          user: null,
          errors: [{ field: "password", message: "Invalid password" }]
        };
      }

      return { success: true, message: "Login successful", user, errors: [] };
    },

    getAllEmployees: async () => {
      const employees = await Employee.find().sort({ created_at: -1 });
      return { success: true, message: "Employees fetched", employees, errors: [] };
    },

    searchEmployeeByEid: async (_, { eid }) => {
      const employee = await Employee.findById(eid);
      if (!employee) {
        return {
          success: false,
          message: "Employee not found",
          employee: null,
          errors: [{ field: "eid", message: "No employee with this id" }]
        };
      }
      return { success: true, message: "Employee fetched", employee, errors: [] };
    },

    searchEmployeeByDesignationOrDepartment: async (_, { designation, department }) => {
      const d1 = (designation || "").trim();
      const d2 = (department || "").trim();

      if (!d1 && !d2) {
        return {
          success: false,
          message: "Validation failed",
          employees: [],
          errors: [{ field: "designation/department", message: "Provide designation or department" }]
        };
      }

      const filter = {};
      if (d1) filter.designation = d1;
      if (d2) filter.department = d2;

      const employees = await Employee.find(filter).sort({ created_at: -1 });
      return { success: true, message: "Employees fetched", employees, errors: [] };
    }
  },

  Mutation: {
    signup: async (_, { input }) => {
      const errors = await runValidation(input, signupSchema);
      if (errors.length) return { success: false, message: "Validation failed", user: null, errors };

      try {
        const user = await User.create(input);
        return { success: true, message: "Signup successful", user, errors: [] };
      } catch (err) {
        const dup = mapMongoDupError(err);
        if (dup) return { success: false, message: "Duplicate value", user: null, errors: dup };
        return { success: false, message: "Signup failed", user: null, errors: [{ field: "server", message: err.message }] };
      }
    },

    addNewEmployee: async (_, { input }) => {
      const errors = await runValidation(input, employeeCreateSchema);
      if (errors.length) return { success: false, message: "Validation failed", employee: null, errors };

      try {
        const photoUrl = await uploadToCloudinaryIfNeeded(input.employee_photo || "");
        const employee = await Employee.create({ ...input, employee_photo: photoUrl });
        return { success: true, message: "Employee created", employee, errors: [] };
      } catch (err) {
        const dup = mapMongoDupError(err);
        if (dup) return { success: false, message: "Duplicate value", employee: null, errors: dup };
        return { success: false, message: "Create employee failed", employee: null, errors: [{ field: "server", message: err.message }] };
      }
    },

    updateEmployeeByEid: async (_, { eid, input }) => {
      if (input.gender && !["Male", "Female", "Other"].includes(input.gender)) {
        return {
          success: false,
          message: "Validation failed",
          employee: null,
          errors: [{ field: "gender", message: "gender must be Male/Female/Other" }]
        };
      }

      if (typeof input.salary === "number" && input.salary < 1000) {
        return {
          success: false,
          message: "Validation failed",
          employee: null,
          errors: [{ field: "salary", message: "salary must be >= 1000" }]
        };
      }

      try {
        const updateData = { ...input };

        if (input.employee_photo) {
          const photoUrl = await uploadToCloudinaryIfNeeded(input.employee_photo);
          updateData.employee_photo = photoUrl;
        }

        const employee = await Employee.findByIdAndUpdate(eid, updateData, { new: true });
        if (!employee) {
          return {
            success: false,
            message: "Employee not found",
            employee: null,
            errors: [{ field: "eid", message: "No employee with this id" }]
          };
        }

        return { success: true, message: "Employee updated", employee, errors: [] };
      } catch (err) {
        const dup = mapMongoDupError(err);
        if (dup) return { success: false, message: "Duplicate value", employee: null, errors: dup };
        return { success: false, message: "Update employee failed", employee: null, errors: [{ field: "server", message: err.message }] };
      }
    },

    deleteEmployeeByEid: async (_, { eid }) => {
      const employee = await Employee.findByIdAndDelete(eid);
      if (!employee) {
        return {
          success: false,
          message: "Employee not found",
          errors: [{ field: "eid", message: "No employee with this id" }]
        };
      }
      return { success: true, message: "Employee deleted", errors: [] };
    }
  }
};

module.exports = resolvers;