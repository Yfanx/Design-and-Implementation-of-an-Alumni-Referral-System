package cn.iocoder.yudao.framework.common.exception;

import cn.iocoder.yudao.framework.common.pojo.CommonResult;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ReferralGlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public CommonResult<Void> handleIllegalArgument(IllegalArgumentException exception) {
        return CommonResult.error(exception.getMessage());
    }

    @ExceptionHandler(DuplicateKeyException.class)
    public CommonResult<Void> handleDuplicateKey(DuplicateKeyException exception) {
        return CommonResult.error("数据已存在，请勿重复提交");
    }
}
