/* 
HOW USER FLOW WILL LOOK LIKE WITH THIS DATABASE:

1) User uploads "Essay Draft 1"
- New Assignment created (if first time)
- Version 1 added

2) User uploads "Draft 2"
- Same assignment
- Version 2 added

3) File is stored in Azure Blob Storage (working on this), and you save the following:
file_path = "user123/assignments45/v2.docx"

HOW THIS LOOKS VISUALLY:
Users (1)
  └── Assignments (many)
         └── Versions (many)

*/


-- User table
CREATE TABLE Users (
    user_id INT PRIMARY KEY IDENTITY (1,1),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- Assignments table
CREATE TABLE Assignments (
    assignment_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT GETDATE(),

    FOREIGN KEY (user_id) REFERENCES Users(user_id)
        ON DELETE CASCADE
);

-- Versions Table
CREATE TABLE Versions (
    version_id INT PRIMARY KEY IDENTITY(1,1),
    assignment_id INT NOT NULL,
    version_number INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    uploaded_at DATETIME DEFAULT GETDATE(),

    FOREIGN KEY (assignment_id) REFERENCES Assignments(assignment_id)
        ON DELETE CASCADE
);