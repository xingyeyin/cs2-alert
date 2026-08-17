<template>
  <div class="alerts-page">
    <!-- 预警规则管理 -->
    <el-card shadow="never" class="block">
      <template #header>
        <div class="card-header">
          <span>预警规则</span>
          <el-button type="primary" @click="openDialog()">
            <el-icon style="margin-right: 4px"><Plus /></el-icon>
            新增规则
          </el-button>
        </div>
      </template>

      <el-table :data="rules" v-loading="rulesLoading" border stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="item_name" label="标的" min-width="140">
          <template #default="{ row }">{{ row.item_name }}（{{ row.item_code }}）</template>
        </el-table-column>
        <el-table-column prop="rule_name" label="规则名" min-width="120">
          <template #default="{ row }">{{ row.rule_name || '-' }}</template>
        </el-table-column>
        <el-table-column label="基准" width="120">
          <template #default="{ row }">
            {{ row.base_type === 2 ? `自定义 ¥${Number(row.base_price).toFixed(2)}` : '近7日均价' }}
          </template>
        </el-table-column>
        <el-table-column label="涨幅阈值" width="100" align="center">
          <template #default="{ row }">+{{ row.up_threshold }}%</template>
        </el-table-column>
        <el-table-column label="跌幅阈值" width="100" align="center">
          <template #default="{ row }">-{{ row.down_threshold }}%</template>
        </el-table-column>
        <el-table-column label="提醒" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.notify_enabled === 1 ? 'success' : 'info'" size="small">
              {{ row.notify_enabled === 1 ? '开启' : '关闭' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="trigger_count" label="触发次数" width="90" align="center" />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="removeRule(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 触发记录 -->
    <el-card shadow="never" class="block">
      <template #header>
        <div class="card-header">
          <span>触发记录</span>
          <el-button plain @click="loadRecords">刷新</el-button>
        </div>
      </template>
      <el-table :data="records" v-loading="recordsLoading" border stripe>
        <el-table-column prop="triggered_at" label="触发时间" width="170" />
        <el-table-column prop="item_name" label="标的" min-width="140" />
        <el-table-column label="方向" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.trigger_type === 1 ? 'danger' : 'success'" size="small">
              {{ row.trigger_type === 1 ? '上涨' : '下跌' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="触发价" width="100" align="right">
          <template #default="{ row }">¥{{ Number(row.trigger_price).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="基准价" width="100" align="right">
          <template #default="{ row }">¥{{ Number(row.base_price).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="涨跌幅" width="100" align="right">
          <template #default="{ row }">
            <span :style="{ color: Number(row.change_rate) >= 0 ? '#ef232a' : '#14b143' }">
              {{ Number(row.change_rate) >= 0 ? '+' : '' }}{{ Number(row.change_rate).toFixed(2) }}%
            </span>
          </template>
        </el-table-column>
        <el-table-column label="阈值" width="80" align="center">
          <template #default="{ row }">{{ row.threshold_value }}%</template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_read === 1 ? 'info' : 'warning'" size="small">
              {{ row.is_read === 1 ? '已读' : '未读' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增 / 编辑规则对话框 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑预警规则' : '新增预警规则'" width="520px">
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="监控标的" prop="item_id">
          <el-select v-model="form.item_id" placeholder="选择标的" style="width: 100%">
            <el-option
              v-for="it in items"
              :key="it.id"
              :label="`${it.name}（${it.code}）`"
              :value="it.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="规则名称">
          <el-input v-model="form.rule_name" placeholder="可选，例如 反冲武器箱默认预警" />
        </el-form-item>
        <el-form-item label="基准类型">
          <el-radio-group v-model="form.base_type">
            <el-radio :value="1">近7日均价</el-radio>
            <el-radio :value="2">自定义基准价</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.base_type === 2" label="基准价" prop="base_price">
          <el-input-number v-model="form.base_price" :min="0" :precision="2" :controls="false" style="width: 100%" />
        </el-form-item>
        <el-form-item label="涨幅阈值" prop="up_threshold">
          <el-input-number v-model="form.up_threshold" :min="0" :precision="2" :step="0.5" style="width: 100%" />
          <span class="unit">%</span>
        </el-form-item>
        <el-form-item label="跌幅阈值" prop="down_threshold">
          <el-input-number v-model="form.down_threshold" :min="0" :precision="2" :step="0.5" style="width: 100%" />
          <span class="unit">%</span>
        </el-form-item>
        <el-form-item label="提醒开关">
          <el-switch v-model="form.notify_enabled" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getItems } from '../api/items'
import { createAlertRule, deleteAlertRule, getAlertRecords, getAlertRules, updateAlertRule } from '../api/alerts'

const rules = ref([])
const records = ref([])
const items = ref([])
const rulesLoading = ref(false)
const recordsLoading = ref(false)
const dialogVisible = ref(false)
const saving = ref(false)
const formRef = ref()

// 表单默认值：阈值默认 ±5%，可任意修改
const defaultForm = () => ({
  id: null,
  item_id: null,
  rule_name: '',
  base_type: 1,
  base_price: null,
  up_threshold: 5,
  down_threshold: 5,
  notify_enabled: 1,
})
const form = ref(defaultForm())
const formRules = {
  item_id: [{ required: true, message: '请选择监控标的', trigger: 'change' }],
  up_threshold: [{ required: true, message: '请输入涨幅阈值', trigger: 'blur' }],
  down_threshold: [{ required: true, message: '请输入跌幅阈值', trigger: 'blur' }],
}

const loadRules = async () => {
  rulesLoading.value = true
  try {
    const data = await getAlertRules()
    rules.value = data.list || []
  } finally {
    rulesLoading.value = false
  }
}

const loadRecords = async () => {
  recordsLoading.value = true
  try {
    const data = await getAlertRecords({ limit: 50 })
    records.value = data.list || []
  } finally {
    recordsLoading.value = false
  }
}

const openDialog = (row) => {
  form.value = row
    ? {
        ...defaultForm(),
        ...row,
        base_price: row.base_price === null ? null : Number(row.base_price),
        up_threshold: Number(row.up_threshold),
        down_threshold: Number(row.down_threshold),
      }
    : defaultForm()
  dialogVisible.value = true
}

const submitForm = async () => {
  await formRef.value.validate()
  saving.value = true
  try {
    const payload = { ...form.value }
    delete payload.id
    if (form.value.id) {
      await updateAlertRule(form.value.id, payload)
      ElMessage.success('规则更新成功')
    } else {
      await createAlertRule(payload)
      ElMessage.success('规则创建成功')
    }
    dialogVisible.value = false
    loadRules()
  } finally {
    saving.value = false
  }
}

const removeRule = async (row) => {
  await ElMessageBox.confirm(`确定删除规则「${row.rule_name || row.item_name}」吗？`, '删除确认', {
    type: 'warning',
  })
  await deleteAlertRule(row.id)
  ElMessage.success('规则删除成功')
  loadRules()
}

onMounted(async () => {
  const data = await getItems({ page: 1, pageSize: 100 })
  items.value = data.list || []
  loadRules()
  loadRecords()
})
</script>

<style scoped>
.alerts-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.unit {
  margin-left: 6px;
  color: #909399;
}
</style>
