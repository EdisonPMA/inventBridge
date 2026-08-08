import api from "./api";

/** Active categories for filter chips — public endpoint */
export async function getActiveCategories() {
  const res = await api.get("/categories", { params: { status: "active" } });
  return res.data.categories ?? [];
}

/** Admin — create / update / delete categories */
export async function createCategory(data)    { return (await api.post("/categories", data)).data; }
export async function updateCategory(id, data){ return (await api.put(`/categories/${id}`, data)).data; }
export async function deleteCategory(id)      { return (await api.delete(`/categories/${id}`)).data; }
