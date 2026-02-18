import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getAllUsers,
  getUserById,
  updateUserRole,
  logAuditAction,
  getAuditLogs,
  getSystemSetting,
  updateSystemSetting,
  addMedication,
  updateMedication,
  deleteMedication,
  addCondition,
  updateCondition,
  deleteCondition,
  addCode,
  updateCode,
  deleteCode,
  getSystemStats,
  getAllMedications,
  getAllConditions,
  getAllCodes,
} from "../db";

export const adminRouter = router({
  // Dashboard Stats
  getSystemStats: adminProcedure.query(async () => {
    return await getSystemStats();
  }),

  // User Management
  getAllUsers: adminProcedure.query(async () => {
    return await getAllUsers();
  }),

  updateUserRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
    .mutation(async ({ input, ctx }) => {
      await logAuditAction(
        ctx.user.id,
        "UPDATE_USER_ROLE",
        "user",
        input.userId,
        { role: input.role }
      );
      return await updateUserRole(input.userId, input.role);
    }),

  // Audit Logs
  getAuditLogs: adminProcedure
    .input(z.object({ limit: z.number().default(100) }).optional())
    .query(async ({ input }) => {
      return await getAuditLogs(input?.limit || 100);
    }),

  // System Settings
  getSystemSetting: adminProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      return await getSystemSetting(input.key);
    }),

  updateSystemSetting: adminProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await logAuditAction(
        ctx.user.id,
        "UPDATE_SETTING",
        "systemSetting",
        undefined,
        { key: input.key, value: input.value }
      );
      return await updateSystemSetting(
        input.key,
        input.value,
        input.description,
        ctx.user.id
      );
    }),

  // Medication Management
  getAllMedications: adminProcedure.query(async () => {
    return await getAllMedications();
  }),

  addMedication: adminProcedure
    .input(
      z.object({
        scientificName: z.string(),
        tradeNames: z.string(),
        indication: z.string().optional(),
        icdCodes: z.string(),
        coverageStatus: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await addMedication(input);
      await logAuditAction(
        ctx.user.id,
        "ADD_MEDICATION",
        "medication",
        undefined,
        input
      );
      return result;
    }),

  updateMedication: adminProcedure
    .input(
      z.object({
        id: z.number(),
        scientificName: z.string().optional(),
        tradeNames: z.string().optional(),
        indication: z.string().optional(),
        icdCodes: z.string().optional(),
        coverageStatus: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const result = await updateMedication(id, data);
      await logAuditAction(ctx.user.id, "UPDATE_MEDICATION", "medication", id, data);
      return result;
    }),

  deleteMedication: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await logAuditAction(
        ctx.user.id,
        "DELETE_MEDICATION",
        "medication",
        input.id
      );
      return await deleteMedication(input.id);
    }),

  // Condition Management
  getAllConditions: adminProcedure.query(async () => {
    return await getAllConditions();
  }),

  addCondition: adminProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        relatedMedications: z.string(),
        relatedCodes: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await addCondition(input);
      await logAuditAction(ctx.user.id, "ADD_CONDITION", "condition", undefined, input);
      return result;
    }),

  updateCondition: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        relatedMedications: z.string().optional(),
        relatedCodes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const result = await updateCondition(id, data);
      await logAuditAction(ctx.user.id, "UPDATE_CONDITION", "condition", id, data);
      return result;
    }),

  deleteCondition: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await logAuditAction(
        ctx.user.id,
        "DELETE_CONDITION",
        "condition",
        input.id
      );
      return await deleteCondition(input.id);
    }),

  // Code Management
  getAllCodes: adminProcedure.query(async () => {
    return await getAllCodes();
  }),

  addCode: adminProcedure
    .input(
      z.object({
        code: z.string(),
        description: z.string(),
        branches: z.string(),
        relatedMedications: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await addCode(input);
      await logAuditAction(ctx.user.id, "ADD_CODE", "code", undefined, input);
      return result;
    }),

  updateCode: adminProcedure
    .input(
      z.object({
        id: z.number(),
        code: z.string().optional(),
        description: z.string().optional(),
        branches: z.string().optional(),
        relatedMedications: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const result = await updateCode(id, data);
      await logAuditAction(ctx.user.id, "UPDATE_CODE", "code", id, data);
      return result;
    }),

  deleteCode: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await logAuditAction(ctx.user.id, "DELETE_CODE", "code", input.id);
      return await deleteCode(input.id);
    }),
});
