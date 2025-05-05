export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  phone: string;
  department?: string;
  createdAt: Date;
}

export interface Photo {
  id: string;
  url: string;
  key: string;
  employeeId: string;
  createdAt: Date;
  status?: "processed" | "unprocessed";
}

export interface PhotoWithEmployee extends Photo {
  employee: Employee;
}
