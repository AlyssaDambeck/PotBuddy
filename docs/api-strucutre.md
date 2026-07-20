# Proposed PotBuddy API Structure

```text
backend/
├── config/
│   └── db.js
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   ├── speciesController.js
│   ├── plantController.js
│   ├── journalController.js
│   └── weatherController.js
├── middleware/
│   ├── authMiddleware.js
│   ├── errorMiddleware.js
│   └── validateObjectId.js
├── models/
│   ├── User.js
│   ├── PlantSpecies.js
│   ├── UserPlant.js
│   └── JournalEntry.js
├── routes/
│   ├── authRoutes.js
│   ├── healthRoutes.js
│   ├── userRoutes.js
│   ├── speciesRoutes.js
│   ├── plantRoutes.js
│   ├── journalRoutes.js
│   └── weatherRoutes.js
├── services/
│   ├── emailService.js
│   ├── googleAuthService.js
│   └── weatherService.js
├── tests/
├── app.js
└── server.js
