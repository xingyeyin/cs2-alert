<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>标的管理</span>
        <el-button type="primary" @click="openDialog()">
          <el-icon style="margin-right: 4px"><Plus /></el-icon>
          新增标的
        </el-button>
      </div>
    </template>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-input
        v-model="query.keyword"
        placeholder="搜索代码 / 名称"
        clearable
        style="width: 220px"
        @keyup.enter="loadList(1)"
      />
      <el-select v-model="query.category" placeholder="全部分类" clearable style="width: 140px">
        <el-option label="武器箱" :value="0" />
        <el-option label="纪念包" :value="1" />
      </el-select>
      <el-select v-model="query.enabled" placeholder="全部状态" clearable style="width: 140px">
        <el-option label="监控中" :value="1" />
        <el-option label="已停用" :value="0" />
      </el-select>
      <el-button type="primary" plain @click="loadList(1)">查询</el-button>
      <el-button @click="resetQuery">重置</el-button>
    </div>

    <!-- 标的列表 -->
    <el-table :data="list" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="code" label="代码" min-width="140" />
      <el-table-column prop="name" label="名称" min-width="180" />
      <el-table-column label="分类" width="100">
        <template #default="{ row }">
          <el-tag :type="row.category === 0 ? 'primary' : 'warning'">
            {{ row.category === 0 ? '武器箱' : '纪念包' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最新价" width="110" align="right">
        <template #default="{ row }">
          {{ row.current_price === null ? '-' : '¥' + Number(row.current_price).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column label="监控状态" width="110">
        <template #default="{ row }">
          <!-- 启用 / 停用监控开关 -->
          <el-switch
            :model-value="row.enabled === 1"
            @change="(val) => toggleStatus(row, val)"
          />
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="170" />
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
          <el-button link type="danger" @click="removeItem(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-bar">
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="loadList()"
        @size-change="loadList(1)"
      />
    </div>

    <!-- 新增 / 编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑标的' : '新增标的'" width="480px">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px">
        <el-form-item label="标的代码" prop="code">
          <el-input v-model="form.code" placeholder="例如 case-recoil" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="例如 反冲武器箱" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-radio-group v-model="form.category">
            <el-radio :value="0">武器箱</el-radio>
            <el-radio :value="1">纪念包</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="图标地址">
          <el-input v-model="form.icon_url" placeholder="可选" />
        </el-form-item>
        <el-form-item label="最新价">
          <el-input-number v-model="form.current_price" :min="0" :precision="2" :controls="false" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { createItem, deleteItem, getItems, updateItem, updateItemStatus } from '../api/items'

// 列表查询条件
const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  category: undefined,
  enabled: undefined,
})

const list = ref([])
const total = ref(0)
const loading = ref(false)
const dialogVisible = ref(false)
const saving = ref(false)
const formRef = ref()

// 表单数据与校验规则
const defaultForm = () => ({ id: null, code: '', name: '', category: 0, icon_url: '', current_price: null })
const form = ref(defaultForm())
const formRules = {
  code: [{ required: true, message: '请输入标的代码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
}

// 加载标的列表
const loadList = async (page) => {
  if (page) query.page = page
  loading.value = true
  try {
    const data = await getItems(query)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

// 重置筛选条件
const resetQuery = () => {
  query.keyword = ''
  query.category = undefined
  query.enabled = undefined
  loadList(1)
}

// 打开新增 / 编辑对话框
const openDialog = (row) => {
  form.value = row ? { ...row, icon_url: row.icon_url || '', current_price: row.current_price === null ? null : Number(row.current_price) } : defaultForm()
  dialogVisible.value = true
}

// 提交表单（新增或编辑）
const submitForm = async () => {
  await formRef.value.validate()
  saving.value = true
  try {
    const payload = {
      code: form.value.code,
      name: form.value.name,
      category: form.value.category,
      icon_url: form.value.icon_url || null,
      current_price: form.value.current_price,
    }
    if (form.value.id) {
      await updateItem(form.value.id, payload)
      ElMessage.success('更新成功')
    } else {
      await createItem(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadList()
  } finally {
    saving.value = false
  }
}

// 启用 / 停用监控
const toggleStatus = async (row, val) => {
  try {
    await updateItemStatus(row.id, val ? 1 : 0)
    row.enabled = val ? 1 : 0
    ElMessage.success(val ? '已启用监控' : '已停用监控')
  } catch {
    // 失败时开关自动回弹
    row.enabled = val ? 0 : 1
  }
}

// 删除标的（二次确认）
const removeItem = async (row) => {
  await ElMessageBox.confirm(`确定删除标的「${row.name}」吗？相关行情与预警数据将一并删除。`, '删除确认', {
    type: 'warning',
  })
  await deleteItem(row.id)
  ElMessage.success('删除成功')
  loadList()
}

onMounted(() => loadList())
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.filter-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}
</style>
