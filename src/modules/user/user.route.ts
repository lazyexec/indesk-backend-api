import express from "express";
import userController from "./user.controller";
import auth from "../../middlewares/auth";
import validate from "../../middlewares/validate";
import userValidation from "./user.validation";
import userFileUploadMiddleware from "../../middlewares/fileUploader";
const uploadAll = userFileUploadMiddleware("./public/uploads/all").fields([
  { name: "avatar", maxCount: 1 },
  { name: "documents", maxCount: 2 },
]);

const router = express.Router();

router.route("/self/in").get(auth("common"), userController.getProfile);

router
  .route("/self/update")
  .patch(
    auth("common"),
    uploadAll,
    validate(userValidation.updateProfile),
    userController.updateProfile
  );

// Admin Route (must be registered before ":userId" to avoid route collisions)
router.get(
  "/all",
  auth("admin"),
  validate(userValidation.queryAllUsers),
  userController.queryAllUsers
);

router
  .route("/:userId")
  .get(
    auth("common"),
    validate(userValidation.getUserById),
    userController.getProfileById
  );

router
  .route("/restrict/:userId")
  .post(
    auth("admin"),
    validate(userValidation.restrictUser),
    userController.restrictUser
  );

router
  .route("/unrestrict/:userId")
  .post(
    auth("admin"),
    validate(userValidation.unrestrictUser),
    userController.unrestrictUser
  );

router
  .route("/create")
  .post(
    auth("admin"),
    uploadAll,
    validate(userValidation.addUser),
    userController.addUser
  );

router
  .route("/delete/:userId")
  .delete(
    auth("admin"),
    validate(userValidation.getUserById),
    userController.deleteUser
  );
router
  .route("/recover/:userId")
  .post(
    auth("admin"),
    validate(userValidation.getUserById),
    userController.recoverUser
  );

export default router;
