-- Insert User
INSERT INTO Users (username, email, password_hash)
VALUES ('testuser', 'test@example.com', 'hashedpassword');

DECLARE @UserId INT = SCOPE_IDENTITY(); -- gives an auto id for User

-- Insert Assignment
INSERT INTO Assignments (user_id, title)
VALUES (@UserId, 'Sample Essay');

DECLARE @AssignmentId INT = SCOPE_IDENTITY(); -- gives an auto ID for the assignment

-- Insert Versions
INSERT INTO Versions (assignment_id, version_number, file_path)
VALUES
(@AssignmentId, 1, 'user1/assignment1/v1.docx'), -- Allows two doc uploads at a time
(@AssignmentId, 2, 'user1/assignment1/v2.docx');