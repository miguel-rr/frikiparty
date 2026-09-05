/** Stand-in for next/cache outside a Next request: revalidation is a no-op. */
const revalidatePath = (_path: string, _type?: string) => {};
const revalidateTag = (_tag: string) => {};

export { revalidatePath, revalidateTag };
